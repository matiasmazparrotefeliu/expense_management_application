"""In-process unit tests for the receipt text extractor and AI response structuring.

These run without the Docker container and without touching any database: the
provider HTTP call is never executed (only pure helpers are exercised), so no
API key is required."""

import pytest
from fastapi import HTTPException

from backend.src.core.receipt_text import ReceiptTextExtractor
from backend.src.services.receipt_service import ReceiptService

CATEGORY_OPTIONS = [
    {"id": 1, "name": "sueldo"},
    {"id": 2, "name": "supermercado"},
    {"id": 3, "name": "alquiler"},
]


@pytest.fixture
def extractor():
    return ReceiptTextExtractor()


class TestReceiptTextExtractorValidation:
    def test_rejects_unsupported_extension(self, extractor):
        with pytest.raises(HTTPException) as exc_info:
            extractor.validate(b"hello", "receipt.txt")
        assert exc_info.value.status_code == 422
        assert "Unsupported receipt format" in exc_info.value.detail

    def test_rejects_empty_upload(self, extractor):
        with pytest.raises(HTTPException) as exc_info:
            extractor.validate(b"", "receipt.png")
        assert exc_info.value.status_code == 422

    def test_rejects_oversized_file(self, extractor):
        big = b"0" * (ReceiptTextExtractor.MAX_FILE_SIZE_BYTES + 1)
        with pytest.raises(HTTPException) as exc_info:
            extractor.validate(big, "receipt.pdf")
        assert exc_info.value.status_code == 422

    def test_accepts_allowed_extensions(self, extractor):
        for filename in ("a.pdf", "b.PNG", "c.jpg", "d.jpeg", "e.webp"):
            extractor.validate(b"data", filename)

    def test_missing_extension_is_rejected(self, extractor):
        with pytest.raises(HTTPException):
            extractor.validate(b"data", None)


class TestExtractionPrompt:
    def test_prompt_includes_receipt_text_and_categories(self):
        prompt = ReceiptService.build_extraction_prompt("TOTAL: USD 250.00", CATEGORY_OPTIONS)
        assert "TOTAL: USD 250.00" in prompt
        for option in CATEGORY_OPTIONS:
            assert option["name"] in prompt
        assert '"type": "income"|"expense"|"transfer"' in prompt

    def test_prompt_demands_json_only(self):
        prompt = ReceiptService.build_extraction_prompt("some text", CATEGORY_OPTIONS)
        assert "ONLY a valid JSON object" in prompt


class TestParseExtraction:
    def test_parses_plain_json(self):
        extraction = ReceiptService.parse_extraction('{"concept": "X", "amount": 5}')
        assert extraction["concept"] == "X"

    def test_parses_json_inside_markdown_fences(self):
        fenced = "Here you go:\n```json\n{\"concept\": \"Y\", \"amount\": 7}\n```\nDone."
        extraction = ReceiptService.parse_extraction(fenced)
        assert extraction["amount"] == 7

    def test_invalid_json_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            ReceiptService.parse_extraction("not json at all")
        assert exc_info.value.status_code == 400

    def test_non_object_json_raises_400(self):
        with pytest.raises(HTTPException) as exc_info:
            ReceiptService.parse_extraction("[1, 2, 3]")
        assert exc_info.value.status_code == 400


class TestToOperationPayload:
    def test_full_mapping(self):
        extraction = {
            "concept": "Supermercado",
            "amount": "250.75",
            "type": "expense",
            "currency": "usd",
            "name": "Carrefour",
            "category": "Supermercado",
        }
        payload = ReceiptService.to_operation_payload(extraction, CATEGORY_OPTIONS)

        assert payload["concept"] == "Supermercado"
        assert payload["amount"] == 250.75
        assert payload["type"] == "expense"
        assert payload["category_id"] == 2
        assert payload["name"] == "Carrefour"
        assert payload["currency"] == "USD"

    def test_missing_required_fields_raise_400(self):
        with pytest.raises(HTTPException) as exc_info:
            ReceiptService.to_operation_payload({"concept": "Only concept"}, CATEGORY_OPTIONS)
        assert exc_info.value.status_code == 400
        assert "required fields" in exc_info.value.detail

    def test_non_numeric_amount_raises_400(self):
        extraction = {"concept": "X", "amount": "much", "type": "expense", "category": "supermercado"}
        with pytest.raises(HTTPException) as exc_info:
            ReceiptService.to_operation_payload(extraction, CATEGORY_OPTIONS)
        assert exc_info.value.status_code == 400
        assert "not a number" in exc_info.value.detail

    def test_negative_amount_raises_400(self):
        extraction = {"concept": "X", "amount": -5, "type": "expense", "category": "supermercado"}
        with pytest.raises(HTTPException) as exc_info:
            ReceiptService.to_operation_payload(extraction, CATEGORY_OPTIONS)
        assert exc_info.value.status_code == 400
        assert "positive" in exc_info.value.detail

    def test_unknown_category_raises_400(self):
        extraction = {"concept": "X", "amount": 10, "type": "expense", "category": "crypto"}
        with pytest.raises(HTTPException) as exc_info:
            ReceiptService.to_operation_payload(extraction, CATEGORY_OPTIONS)
        assert exc_info.value.status_code == 400
        assert "not in the catalog" in exc_info.value.detail

    def test_unsupported_currency_is_dropped_so_account_currency_applies(self):
        extraction = {
            "concept": "X",
            "amount": 10,
            "type": "expense",
            "currency": "GBP",
            "category": "supermercado",
        }
        payload = ReceiptService.to_operation_payload(extraction, CATEGORY_OPTIONS)
        assert payload["currency"] is None

    def test_transfer_without_name_maps_to_none_for_defaulting(self):
        """`OperationService.create_new` turns None into 'Other' for transfers."""
        extraction = {
            "concept": "Sent money",
            "amount": 100,
            "type": "transfer",
            "category": "alquiler",
        }
        payload = ReceiptService.to_operation_payload(extraction, CATEGORY_OPTIONS)
        assert payload["name"] is None