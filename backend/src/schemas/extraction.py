"""Pydantic schema that validates and normalizes the AI's structured extraction.

The LLM answers free-form JSON; this schema is the single source of truth for
its shape and normalization (concept stripping, localized amount parsing,
operation-type aliases, currency whitelist) before the business rules in
`TextOperationService.to_operation_payload` match the suggested category against
the active catalog."""

from typing import Optional

from pydantic import BaseModel, field_validator

from ..core.currencies import SUPPORTED_CURRENCIES
from ..core.operation_types import normalize_operation_type


def parse_localized_amount(value) -> float:
    """Coerce an AI-extracted amount to a float, tolerating es-AR formatting.

    Accepts plain numbers, "1234.56", "1.234,56" (dots as thousands, comma as
    decimal) and "2500" / "2,500" (three trailing digits treated as thousands).
    Raises `ValueError` when nothing numeric can be parsed."""
    if isinstance(value, bool):
        raise ValueError(f"The extracted amount '{value}' is not a number")
    if isinstance(value, (int, float)):
        return float(value)
    raw = str(value).strip()
    if not raw:
        raise ValueError("The extracted amount must not be empty")
    normalized = raw
    if "," in raw and "." in raw:
        normalized = raw.replace(".", "").replace(",", ".")
    elif "," in raw:
        whole, _, decimals = raw.rpartition(",")
        if whole.isdigit() and decimals.isdigit() and len(decimals) == 3:
            normalized = raw.replace(",", "")
        else:
            normalized = raw.replace(",", ".")
    try:
        return float(normalized)
    except ValueError:
        raise ValueError(f"The extracted amount '{raw}' is not a number")


class AIExtraction(BaseModel):
    """Validated/normalized operation data as extracted by the AI provider.

    `type` is normalized to the English member name (`expense`/`income`/
    `transfer`) via the shared `TYPE_ALIASES` so Spanish answers like "egreso"
    are accepted; `currency` is uppercase and restricted to
    `SUPPORTED_CURRENCIES` (an unsupported code is rejected instead of being
    silently replaced by the account's currency)."""

    concept: str
    amount: float
    type: str
    currency: Optional[str] = None
    name: Optional[str] = None
    category: str

    @field_validator("concept")
    @classmethod
    def concept_stripped(cls, value):
        concept = str(value).strip()
        if not concept:
            raise ValueError("The concept must not be empty")
        return concept

    @field_validator("amount", mode="before")
    @classmethod
    def amount_parsed(cls, value):
        return parse_localized_amount(value)

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, value):
        if value <= 0:
            raise ValueError("The extracted amount must be positive")
        return value

    @field_validator("type")
    @classmethod
    def type_normalized(cls, value):
        return normalize_operation_type(str(value)).name

    @field_validator("currency")
    @classmethod
    def currency_normalized(cls, value):
        if value is None:
            return value
        code = str(value).strip().upper()
        if code not in SUPPORTED_CURRENCIES:
            raise ValueError(
                f"Currency '{code}' is not supported. Supported: {sorted(SUPPORTED_CURRENCIES)}"
            )
        return code

    @field_validator("name")
    @classmethod
    def name_normalized(cls, value):
        if value is None:
            return None
        name = str(value).strip()
        return name or None

    @field_validator("category")
    @classmethod
    def category_normalized(cls, value):
        category = str(value).strip()
        if not category:
            raise ValueError("The category must not be empty")
        return category