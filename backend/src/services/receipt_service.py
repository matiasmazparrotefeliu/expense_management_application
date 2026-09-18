"""Business logic for creating operations automatically from uploaded receipts."""

import json
import os
import re

from fastapi import HTTPException, status
from openai import OpenAI, OpenAIError
from sqlalchemy.orm import Session

from ..core.currencies import SUPPORTED_CURRENCIES
from ..core.receipt_text import ReceiptTextExtractor
from ..models import Category
from ..schemas import CreateOperation
from .operation_service import OperationService

DEFAULT_MODEL = "deepseek-v4-flash-free"
REQUEST_TIMEOUT_SECONDS = 60

class ReceiptService():
    """End-to-end receipt flow: validates the upload, extracts its text, asks the
    AI provider (via the official `openai` client pointed at an OpenAI-compatible
    endpoint) for structured data and persists the resulting operation through
    `OperationService.create_new` so balances, ownership and `name` rules behave
    exactly like manual creation."""

    def __init__(self, db: Session):
        self.db = db
        self.extractor = ReceiptTextExtractor()
        self.operation_service = OperationService(db)

    def create_from_receipt(self, user_id: int, file_bytes: bytes, filename: str | None, account_id: int):
        """Create an operation from an uploaded PDF/image receipt.

        Validation order is cheap-first: file type/size (422), account existence
        and ownership (404/403), provider configuration (503), text extraction
        (422/503), AI call (502) and structuring (400). Only after everything
        checks out is the balance-affecting create executed. Ownership is checked
        here WITHOUT holding the row lock (the AI call can take a while);
        `create_new` re-validates under lock right before mutating the balance."""
        self.extractor.validate(file_bytes, filename)
        self.operation_service.get_owned_account(user_id, account_id)

        api_url, api_key, model = self.provider_config()

        receipt_text = self.extractor.extract(file_bytes, filename)

        categories = self.db.query(Category).filter(Category.is_active == True).all()
        category_options = [{"id": category.id, "name": category.name} for category in categories]

        prompt = self.build_extraction_prompt(receipt_text, category_options)
        content = self.call_provider(api_url, api_key, model, prompt)
        extraction = self.parse_extraction(content)
        operation_data = self.to_operation_payload(extraction, category_options)
        operation_data["account_id"] = account_id

        return self.operation_service.create_new(user_id, CreateOperation(**operation_data))

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
    def build_extraction_prompt(receipt_text: str, category_options: list) -> str:
        """Build the strict-JSON extraction prompt for the receipt text."""
        category_names = ", ".join(option["name"] for option in category_options)
        return (
            "You are a data-extraction engine for expense receipts. Extract the transaction "
            "data from the receipt text below and answer with ONLY a valid JSON object, no "
            "markdown, no explanations.\n\n"
            "Required JSON shape:\n"
            '{"concept": string, "amount": positive number, "currency": string|null, '
            '"type": "income"|"expense"|"transfer", "name": string|null, "category": string}\n\n'
            "Field rules:\n"
            "- concept: short description of the transaction.\n"
            "- amount: the total paid/received, positive number only, no symbols.\n"
            "- currency: ISO-4217 code shown on the receipt (e.g. USD, ARS); null if absent.\n"
            "- type: 'income' if money was received, 'expense' for purchases/bill payments/"
            "subscriptions, 'transfer' if money was sent to a person/account.\n"
            "- name: merchant or service name for purchases/payments/subscriptions, recipient "
            "person for transfers; use 'Other' for transfers when the recipient is not "
            "identifiable; null otherwise.\n"
            f"- category: exactly one of: {category_names}.\n\n"
            "Receipt text:\n"
            "---------------------\n"
            f"{receipt_text}\n"
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
        fields are missing/invalid or the category doesn't match the active catalog."""
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
            amount = round(float(extraction["amount"]), 2)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The extracted amount '{extraction['amount']}' is not a number",
            )
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The extracted amount must be positive, got {amount}",
            )

        requested_category = str(extraction.get("category", "")).strip().lower()
        matched = next(
            (option for option in category_options if option["name"].strip().lower() == requested_category),
            None,
        )
        if matched is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The AI suggested category '{extraction.get('category')}' is not in the "
                       f"catalog. Valid categories: {[option['name'] for option in category_options]}",
            )

        currency = extraction.get("currency")
        if isinstance(currency, str):
            currency = currency.strip().upper()
            if currency not in SUPPORTED_CURRENCIES:
                currency = None

        name = extraction.get("name")
        if isinstance(name, str):
            name = name.strip() or None
        else:
            name = None

        return {
            "concept": str(extraction["concept"]).strip()[:250],
            "amount": amount,
            "type": str(extraction["type"]).strip(),
            "category_id": matched["id"],
            "name": name,
            "currency": currency,
        }