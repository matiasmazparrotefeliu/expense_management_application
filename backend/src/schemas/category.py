"""Pydantic schema for reading predefined categories."""

from pydantic import BaseModel

class CategoryResponse(BaseModel):
    """Category read model. `type` is the linked `OperationType` value
    (`Expense`/`Income`/`Transfer`) the category belongs to."""

    id: int
    name: str
    type: str
    description: str | None = None
    is_active: bool

    class Config:
        from_attributes = True

    def to_dict(self):
        return self.dict()