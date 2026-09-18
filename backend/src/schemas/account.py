"""Pydantic schemas for creating and reading user accounts."""

from pydantic import BaseModel, field_validator

from ..core.currencies import validate_supported_currency

class AccountCreate(BaseModel):
    """Account creation payload. Balance always starts at 0 — it is never client-supplied."""

    name: str
    currency: str

    @field_validator("currency")
    @classmethod
    def currency_must_be_supported(cls, value: str) -> str:
        """Normalize to uppercase and reject any currency outside `SUPPORTED_CURRENCIES`."""
        return validate_supported_currency(value)

    def to_dict(self):
        return self.dict()

class AccountResponse(BaseModel):
    """Account read model."""

    id: int
    name: str
    currency: str
    balance: float
    is_active: bool

    class Config:
        from_attributes = True

    def to_dict(self):
        return self.dict()