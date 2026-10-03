"""Business logic for structuring a free-text operation narration through an LLM.

The user describes an operation in plain words (e.g. "gaste 9800 pesos en
Carrefour") and `TextOperationService` turns that text into a validated
`CreateOperation` payload via the text-only LLM provider. Extraction is
non-destructive: it returns the payload for a preview/confirmation step in the
frontend, and the actual persistence (balance delta, ownership under lock,
category/currency rules) is done by the existing `OperationService.create_new`
when the user confirms through `POST /operations/new`."""

import json
import os
import re

from fastapi import HTTPException, status
from openai import OpenAI, OpenAIError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from ..models import Category
from ..schemas import AIExtraction
from .operation_service import OperationService

DEFAULT_MODEL = "deepseek-v4-flash-free"
REQUEST_TIMEOUT_SECONDS = 60

class TextOperationService():
    """Turns a narrated operation into a validated `CreateOperation` payload.

    Validation order is cheap-first: account existence/ownership (404/403,
    without holding the row lock), provider configuration (503), the LLM call
    (502 and then 400 for structurable-but-invalid extractions) and finally the
    strict currency rule. Nothing is persisted here; `create_new` re-validates
    ownership under lock only when the user confirms the preview."""

    def __init__(self, db: Session):
        self.db = db
        self.operation_service = OperationService(db)

    def extract(self, user_id: int, text: str, account_id: int) -> dict:
        """Structure a narration into a `CreateOperation` payload without creating it.

        The owning account is resolved up front (cheap, no lock) to fail fast on
        404/403 and to inject its currency into the prompt so expressions like
        "pesos" map to ISO codes. The payload is returned as-is for the frontend
        preview; `account_id` is intentionally omitted so the user stays bound to
        the account they selected in the dashboard."""
        account = self.operation_service.get_owned_account(user_id, account_id)

        api_url, api_key, model = self.provider_config()

        categories = self.db.query(Category).filter(Category.is_active == True).all()
        category_options = [
            {"id": category.id, "name": category.name, "type": category.type.value}
            for category in categories
        ]

        prompt = self.build_extraction_prompt(text, category_options, account_currency=account.currency)
        content = self.call_provider(api_url, api_key, model, prompt)
        extraction = self.parse_extraction(content)
        operation_data = self.to_operation_payload(extraction, category_options)
        self.ensure_currency_matches(operation_data, account.currency)
        return operation_data

    @staticmethod
    def ensure_currency_matches(operation_data: dict, account_currency: str):
        """Reject an extraction whose currency differs from the account's (400).

        Mirrors the `Currency mismatch` rule enforced by `OperationService.create_new`
        at persistence time, so the preview already surfaces the conflict instead of
        letting the user confirm an operation that can never be created."""
        currency = operation_data["currency"]
        if currency and currency != account_currency.upper():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Currency mismatch: the operation is in {currency} "
                       f"but the account operates in {account_currency.upper()}",
            )

    @staticmethod
    def provider_config():
        """Read the OpenAI-compatible provider settings from the environment;
        503 when `API_URL`/`API_KEY` are not configured."""
        api_url = os.getenv("API_URL")
        api_key = os.getenv("API_KEY")
        if not api_url or not api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI provider is not configured: set API_URL and API_KEY",
            )
        return api_url, api_key, os.getenv("AI_MODEL", DEFAULT_MODEL)

    @staticmethod
    def build_extraction_prompt(narration_text: str, category_options: list, account_currency: str | None = None) -> str:
        """Build the strict-JSON extraction prompt for the narrated operation.

        Written in Spanish (the app's target language); only the JSON field names and the
        `income`/`expense`/`transfer` enum values stay English because `AIExtraction`
        validates exactly those. `concept` is a brief but formal description of the
        operation derived from the narration (including relevant details like the
        service and month) and `name` is the merchant/service/person, written with
        the official brand spelling. When
        `account_currency` is supplied the model is told to map spoken currency
        expressions like "pesos"/"dólares" to an ISO code and to default to the
        account's currency when none is mentioned."""
        category_names = ", ".join(option["name"] for option in category_options)
        currency_rule = (
            "- currency: código ISO-4217 de la transacción (ej. USD, ARS); null si no se menciona.\n"
        )
        if account_currency:
            currency_rule = (
                "- currency: si el relato menciona una expresión de moneda (ej. "
                "'pesos', 'dolares'), mapeala al código ISO-4217; de lo contrario usá la "
                "moneda de la cuenta, que es '" + account_currency + "'.\n"
            )
        return (
            "Eres un motor de extracción de datos para transacciones financieras descritas "
            "en texto libre. Extraé los datos de la transacción a partir del relato de abajo "
            "y respondé SOLO con un objeto JSON válido, sin markdown ni explicaciones.\n\n"
            "Forma JSON requerida:\n"
            '{"concept": string, "amount": positive number, "currency": string|null, '
            '"type": "income"|"expense"|"transfer", "name": string|null, "category": string}\n\n'
            "IMPORTANTE: usá los nombres de los campos del JSON y los valores "
            "'income'/'expense'/'transfer'/'Other' EXACTAMENTE como aparecen arriba; "
            "no los traduzcas ni los parafrasees al español.\n\n"
            "Reglas de cada campo:\n"
            "- concept: descripción breve pero formal de la operación basada en el "
            "relato, que incluya los detalles relevantes mencionados (servicio, mes, "
            "motivo). No incluyas el monto. Ej: 'Pago de la factura de Claro del mes "
            "de octubre', 'Compra en Carrefour', 'Suscripción a Netflix'.\n"
            "- amount: el total pagado/recibido, solo un número positivo, sin símbolos.\n"
            + currency_rule +
            "- type: 'income' si se recibió dinero, 'expense' para compras/pagos de "
            "servicios/suscripciones, 'transfer' si se envió dinero a una persona/cuenta.\n"
            "- name: el comercio, servicio o persona involucrado (ej. 'Carrefour', 'Claro', "
            "'Netflix', 'Juan Perez'); para transferencias usá 'Other' cuando no se pueda "
            "identificar al destinatario y null en caso contrario. Escribila con la grafía "
            "oficial de la marca, con mayúsculas y acentos correctos, aunque en el relato "
            "aparezca en minúsculas o mal escrita; si la marca no la reconocés, copiala "
            "tal como aparece en el relato.\n"
            f"- category: exactamente una de: {category_names}.\n\n"
            "Ejemplos de 'concept' y 'name': 'pague 3244 pesos de la factura de claro "
            "del mes de octubre' → concept: 'Pago de la factura de Claro del mes de "
            "octubre', name: 'Claro'; 'gasté 9800 pesos en carrefour' → "
            "concept: 'Compra en Carrefour', name: 'Carrefour'; 'me suscribí a netflix' "
            "→ concept: 'Suscripción a Netflix', name: 'Netflix'; 'transferí a juan' → "
            "concept: 'Transferencia a Juan', name: 'Juan'.\n\n"
            "Relato:\n"
            "---------------------\n"
            f"{narration_text}\n"
            "---------------------"
        )

    @staticmethod
    def call_provider(api_url: str, api_key: str, model: str, prompt: str) -> str:
        """Call `{API_URL}/chat/completions` through the official `openai` client and
        return the assistant message content; any provider failure surfaces as a 502."""
        client = OpenAI(
            api_key=api_key,
            base_url=api_url.rstrip("/"),
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )
        except OpenAIError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI provider error: {exc}",
            )
        content = response.choices[0].message.content if response.choices else None
        if not content:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The AI provider returned an empty response",
            )
        return content

    @staticmethod
    def parse_extraction(content: str) -> dict:
        """Parse the model output into a dict, tolerating markdown fences or stray
        text around the JSON object; 400 when nothing parseable is found."""
        cleaned = re.sub(r"```(?:json)?|```", "", content).strip()
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        candidate = match.group(0) if match else cleaned
        try:
            extraction = json.loads(candidate)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The AI response is not valid JSON: {content[:300]}",
            )
        if not isinstance(extraction, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The AI response is not a JSON object: {content[:300]}",
            )
        return extraction

    @staticmethod
    def to_operation_payload(extraction: dict, category_options: list) -> dict:
        """Map the extracted dict onto a `CreateOperation` payload; 400 when required
        fields are missing/invalid or the category doesn't match the active catalog.

        Required-field presence is checked before validation (so the raw extraction
        is reported in the error), then `AIExtraction` normalizes amounts (localized
        formats), operation-type aliases and currency. A suggested currency outside
        `SUPPORTED_CURRENCIES` is rejected with a 400 instead of silently inheriting
        the account's. A transfer written as 'other'/'otro' is normalized back to
        `None` so `OperationService.create_new` (the single authority for the
        default) stores the canonical "Other". The category is matched by name AND
        by the normalized operation type the model suggested, since categories are
        tied to an `OperationType`."""
        fields = ("concept", "amount", "type")
        missing = [
            field for field in fields
            if field not in extraction or extraction[field] in (None, "")
        ]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The AI could not extract the required fields {missing}. "
                       f"Raw extraction: {json.dumps(extraction, ensure_ascii=False)[:300]}",
            )
        try:
            validated = AIExtraction(**extraction)
        except ValidationError as exc:
            error = exc.errors()[0]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid extraction field '{'.'.join(map(str, error['loc']))}': {error['msg']}",
            )

        requested_category = validated.category.lower()
        op_type = validated.type.lower()
        matched = next(
            (
                option for option in category_options
                if option["name"].strip().lower() == requested_category
                and option["type"].lower() == op_type
            ),
            None,
        )
        if matched is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The AI suggested category '{validated.category}' is not in the "
                       f"catalog or does not belong to the '{validated.type}' operation type. Valid "
                       f"categories: {[option['name'] for option in category_options]}",
            )

        name = validated.name
        if validated.type == "transfer" and name and name.strip().lower() in ("other", "otro"):
            name = None

        return {
            "concept": validated.concept[:250],
            "amount": round(validated.amount, 2),
            "type": validated.type,
            "category_id": matched["id"],
            "name": name,
            "currency": validated.currency,
        }