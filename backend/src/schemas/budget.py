"""Pydantic schemas for monthly budget limits (spending caps)."""

from typing import Optional
from pydantic import BaseModel, Field, field_validator


class BudgetLimitCreate(BaseModel):
    """Payload to create or update a monthly spending cap.

    `account_id` is required: every cap (and the summary it feeds) is scoped to
    one account, so totals stay in a single currency. `category_id` is optional:
    `None` targets the global limit (over the account's total expenses of the
    period) while an id caps the debit operations of that category. Both ids are
    validated in the service (ownership via `get_owned_account`; the category
    must exist, be active and not be an income one — income never consumes a
    budget)."""

    account_id: int = Field(gt=0)
    category_id: Optional[int] = None
    amount: float = Field(gt=0)
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=1900, le=2100)

    @field_validator("category_id")
    @classmethod
    def category_id_must_be_positive(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and value <= 0:
            raise ValueError("category_id must be greater than zero")
        return value

    def to_dict(self):
        return self.dict()
