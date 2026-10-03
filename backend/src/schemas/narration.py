"""Schemas for the AI-assisted operation entry from a free-text narration."""

from typing import Optional

from pydantic import BaseModel, Field, field_validator


class TextOperationCreate(BaseModel):
    """Body of `POST /operations/from-text`: the narrated operation + target account."""

    text: str = Field(min_length=1, max_length=500)
    account_id: int

    @field_validator("text")
    @classmethod
    def text_stripped(cls, value):
        text = value.strip()
        if not text:
            raise ValueError("The narration text must not be empty")
        return text


class ExtractedOperationResponse(BaseModel):
    """Validated operation data returned by the extraction step (nothing is persisted).

    `type` is the normalized member name (`expense`/`income`/`transfer`) and the
    payload is ready to be confirmed through `POST /operations/new`."""

    concept: str
    amount: float
    currency: Optional[str] = None
    type: str
    category_id: int
    name: Optional[str] = None