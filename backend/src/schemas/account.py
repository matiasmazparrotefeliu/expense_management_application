"""Pydantic schemas for creating and reading user accounts."""

from pydantic import BaseModel, Field, field_validator

from ..core.currencies import validate_supported_currency

class AccountCreate(BaseModel):
    """Account creation payload. The starting `balance` and the banking `bank` are
    always client-supplied: `balance` must be strictly positive and `bank` must be
    a non-empty string (422 otherwise)."""

    name: str
    currency: str
    balance: float = Field(gt=0)
    bank: str

    @field_validator("currency")
    @classmethod
    def currency_must_be_supported(cls, value: str) -> str:
        """Normalize to uppercase and reject any currency outside `SUPPORTED_CURRENCIES`."""
        return validate_supported_currency(value)

    @field_validator("bank")
    @classmethod
    def bank_must_not_be_blank(cls, value: str) -> str:
        """Strip surrounding whitespace and reject a null or empty entity name."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("bank must not be null or empty")
        return stripped

    def to_dict(self):
        return self.dict()

class AccountResponse(BaseModel):
    """Account read model."""

    id: int
    name: str
    currency: str
    balance: float
    bank: str
    is_active: bool

    class Config:
        from_attributes = True

    def to_dict(self):
        return self.dict()