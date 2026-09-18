"""Pydantic schemas for creating and reading operations (income/expense entries)."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator

from ..core.currencies import validate_supported_currency

class OperationResponse(BaseModel):
    """Operation read model."""

    id: int
    concept: str
    amount: float
    type: str
    currency: str
    date: datetime
    account_id: int
    category_id: int
    name: Optional[str] = None

    class Config:
        from_attributes = True

    def to_dict(self):
        return self.dict()

class CreateOperation(BaseModel):
    """Operation creation payload. `account_id` must belong to the authenticated
    user; the service is responsible for enforcing that, not this schema.

    `name` is the merchant/service/person associated with the operation (optional;
    defaults to "Other" for `transfer` operations when omitted, see
    `OperationService.create_new`).

    `currency` is optional: when supplied it must be a supported currency
    (validated here against `SUPPORTED_CURRENCIES`) and must match the target
    account's currency (enforced in the service with a 400); when omitted the
    operation simply inherits the account's currency."""

    concept: str
    amount: float
    type: str
    account_id: int
    category_id: int
    name: Optional[str] = None
    currency: Optional[str] = None

    @field_validator("currency")
    @classmethod
    def currency_must_be_supported(cls, value: Optional[str]) -> Optional[str]:
        """Normalize to uppercase and reject any currency outside `SUPPORTED_CURRENCIES`."""
        if value is None:
            return value
        return validate_supported_currency(value)

    def to_dict(self):
        return self.dict()