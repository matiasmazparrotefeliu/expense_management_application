"""Pydantic schema for reading predefined categories."""

from pydantic import BaseModel

class CategoryResponse(BaseModel):
    """Category read model."""

    id: int
    name: str
    description: str | None = None
    is_active: bool

    class Config:
        from_attributes = True

    def to_dict(self):
        return self.dict()