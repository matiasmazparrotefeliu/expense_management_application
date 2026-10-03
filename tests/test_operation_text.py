"""In-process unit tests for the text-narration operation extraction helpers.

These are pure-helper tests: the provider HTTP call is never executed and no
database is touched, so no API key is required and they import the same `src.*`
modules the in-process app uses (a single module identity). Each behaviour
bucket (prompt, JSON parsing, payload mapping, 400 rejects, currency match) is
a single parametrized test."""

import pytest
from fastapi import HTTPException

from src.services.operation_text_service import TextOperationService

CATEGORY_OPTIONS = [
    {"id": 1, "name": "sueldo", "type": "Income"},
    {"id": 2, "name": "supermercado", "type": "Expense"},
    {"id": 3, "name": "alquiler", "type": "Expense"},
    {"id": 4, "name": "transferencias", "type": "Transfer"},
]


class TestExtractionPrompt:
    def test_prompt_includes_narration_categories_and_json_shape(self):
        prompt = TextOperationService.build_extraction_prompt("gaste 9800 pesos en Carrefour", CATEGORY_OPTIONS)
        assert "gaste 9800 pesos en Carrefour" in prompt
        for option in CATEGORY_OPTIONS:
            assert option["name"] in prompt
        assert '"type": "income"|"expense"|"transfer"' in prompt
        assert '{"concept": string' in prompt
        assert "no los traduzcas" in prompt
        assert "descripción breve pero formal de la operación" in prompt
        assert "incluya los detalles relevantes" in prompt
        assert "Pago de la factura de Claro del mes de octubre" in prompt
        assert "grafía oficial de la marca" in prompt
        assert "'Carrefour'" in prompt

    def test_prompt_demands_json_only(self):
        prompt = TextOperationService.build_extraction_prompt("some text", CATEGORY_OPTIONS)
        assert "SOLO con un objeto JSON válido" in prompt

    @pytest.mark.parametrize(
        "account_currency, expected_fragment",
        [
            (None, "null si no se menciona"),
            ("ARS", "la moneda de la cuenta"),
        ],
    )
    def test_prompt_currency_rule(self, account_currency, expected_fragment):
        """The currency rule switches from a neutral default to the account's currency
        only when `account_currency` is injected into the prompt."""
        prompt = TextOperationService.build_extraction_prompt(
            "gaste 10800 pesos en el supermercado", CATEGORY_OPTIONS, account_currency=account_currency
        )
        assert expected_fragment in prompt
        if account_currency:
            assert account_currency in prompt


class TestParseExtraction:
    @pytest.mark.parametrize(
        "content,key,expected",
        [
            ('{"concept": "X", "amount": 5}', "concept", "X"),
            (
                "Here you go:\n```json\n{\"concept\": \"Y\", \"amount\": 7}\n```\nDone.",
                "amount",
                7,
            ),
        ],
    )
    def test_parses_valid_json(self, content, key, expected):
        extraction = TextOperationService.parse_extraction(content)
        assert extraction[key] == expected

    @pytest.mark.parametrize("content", ["not json at all", "[1, 2, 3]"])
    def test_unparseable_json_raises_400(self, content):
        with pytest.raises(HTTPException) as exc_info:
            TextOperationService.parse_extraction(content)
        assert exc_info.value.status_code == 400


class TestToOperationPayload:
    @pytest.mark.parametrize(
        "extraction, expected_payload",
        [
            (
                {
                    "concept": "Supermercado",
                    "amount": "250.75",
                    "type": "expense",
                    "currency": "usd",
                    "name": "Carrefour",
                    "category": "Supermercado",
                },
                {
                    "concept": "Supermercado",
                    "amount": 250.75,
                    "type": "expense",
                    "currency": "USD",
                    "category_id": 2,
                    "name": "Carrefour",
                },
            ),
            (
                # Spanish alias + localized expression: 'egreso'/'ars' are normalized.
                {
                    "concept": "Supermercado",
                    "amount": 10800,
                    "type": "egreso",
                    "currency": "ars",
                    "category": "Supermercado",
                },
                {
                    "concept": "Supermercado",
                    "amount": 10800.0,
                    "type": "expense",
                    "currency": "ARS",
                    "category_id": 2,
                    "name": None,
                },
            ),
            (
                {
                    "concept": "Sueldo",
                    "amount": 2500000,
                    "type": "ingreso",
                    "category": "sueldo",
                },
                {
                    "concept": "Sueldo",
                    "amount": 2500000.0,
                    "type": "income",
                    "currency": None,
                    "category_id": 1,
                    "name": None,
                },
            ),
            (
                {
                    "concept": "Sent money",
                    "amount": 100,
                    "type": "transferencia",
                    "category": "transferencias",
                },
                {
                    "concept": "Sent money",
                    "amount": 100.0,
                    "type": "transfer",
                    "currency": None,
                    "category_id": 4,
                    "name": None,
                },
            ),
            (
                # A transfer named 'Otro'/'other' reverts to None so create_new
                # stores the canonical "Other".
                {
                    "concept": "Sent money",
                    "amount": 100,
                    "type": "transfer",
                    "name": "Otro",
                    "category": "transferencias",
                },
                {
                    "concept": "Sent money",
                    "amount": 100.0,
                    "type": "transfer",
                    "currency": None,
                    "category_id": 4,
                    "name": None,
                },
            ),
            (
                {
                    "concept": "Sent money",
                    "amount": 250,
                    "type": "transfer",
                    "name": "other",
                    "category": "transferencias",
                },
                {
                    "concept": "Sent money",
                    "amount": 250.0,
                    "type": "transfer",
                    "currency": None,
                    "category_id": 4,
                    "name": None,
                },
            ),
        ],
    )
    def test_valid_extractions_map_to_payload(self, extraction, expected_payload):
        """Valid extractions map onto the preview payload (`name` stays None here;
        only `OperationService.create_new` turns transfers into 'Other')."""
        payload = TextOperationService.to_operation_payload(extraction, CATEGORY_OPTIONS)
        for key, value in expected_payload.items():
            assert payload[key] == value

    @pytest.mark.parametrize(
        "raw_amount, expected",
        [
            ("2500", 2500.0),
            ("1234.56", 1234.56),
            ("1.234,56", 1234.56),
            ("2,500", 2500.0),
        ],
    )
    def test_parses_localized_amounts(self, raw_amount, expected):
        """Plain and es-AR formats (dots/comma separation, comma-as-thousands) parse to a float."""
        payload = TextOperationService.to_operation_payload(
            {"concept": "X", "amount": raw_amount, "type": "expense", "category": "supermercado"},
            CATEGORY_OPTIONS,
        )
        assert payload["amount"] == expected

    @pytest.mark.parametrize(
        "extraction, detail_fragment",
        [
            ({"concept": "Only concept"}, "required fields"),
            ({"concept": "X", "amount": "much", "type": "expense", "category": "supermercado"}, "not a number"),
            ({"concept": "X", "amount": -5, "type": "expense", "category": "supermercado"}, "positive"),
            (
                {"concept": "X", "amount": 10, "type": "expense", "currency": "GBP", "category": "supermercado"},
                "not supported",
            ),
        ],
    )
    def test_invalid_extraction_fields_raise_400(self, extraction, detail_fragment):
        """Any structurable-but-invalid extraction is a single 400 with the offending
        field; an unsupported currency (GBP) is rejected up front instead of silently
        inheriting the account's."""
        with pytest.raises(HTTPException) as exc_info:
            TextOperationService.to_operation_payload(extraction, CATEGORY_OPTIONS)
        assert exc_info.value.status_code == 400
        assert detail_fragment in exc_info.value.detail

    @pytest.mark.parametrize(
        "extraction",
        [
            {"concept": "X", "amount": 10, "type": "expense", "category": "crypto"},
            {"concept": "Sent money", "amount": 100, "type": "transfer", "category": "alquiler"},
        ],
    )
    def test_unmatched_category_raises_400(self, extraction):
        """Categories must exist AND match the operation type, otherwise the preview is rejected."""
        with pytest.raises(HTTPException) as exc_info:
            TextOperationService.to_operation_payload(extraction, CATEGORY_OPTIONS)
        assert exc_info.value.status_code == 400
        assert "not in the catalog" in exc_info.value.detail


class TestEnsureCurrencyMatches:
    @pytest.mark.parametrize("payload_currency", ["usd", None])
    def test_no_currency_conflict_passes(self, payload_currency):
        """A currency equal to the account's — or absent — never conflicts."""
        extraction = {"concept": "X", "amount": 10, "type": "expense", "category": "supermercado"}
        if payload_currency is not None:
            extraction["currency"] = payload_currency
        payload = TextOperationService.to_operation_payload(extraction, CATEGORY_OPTIONS)
        TextOperationService.ensure_currency_matches(payload, "USD")

    def test_different_currency_raises_400(self):
        payload = TextOperationService.to_operation_payload(
            {"concept": "X", "amount": 10, "type": "expense", "currency": "ARS", "category": "supermercado"},
            CATEGORY_OPTIONS,
        )
        with pytest.raises(HTTPException) as exc_info:
            TextOperationService.ensure_currency_matches(payload, "USD")
        assert exc_info.value.status_code == 400
        assert "Currency mismatch" in exc_info.value.detail