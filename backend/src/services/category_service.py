"""Business logic for reading the predefined categories catalog."""

from sqlalchemy.orm import Session
from fastapi import status
from fastapi.responses import JSONResponse

from ..models import Category

class CategoryService():
    """Wraps the read-only `Category` query exposed through `CategoryRoutes`.
    There is no create/update here by design — categories are meant to be
    predefined/seeded, not user-managed."""

    def __init__(self, db: Session):
        self.db = db

    def get_all(self):
        """List every active category."""
        categories = self.db.query(Category).filter(Category.is_active == True).all()
        categories_dict = [category.to_dict() for category in categories]
        return JSONResponse(content=categories_dict, status_code=status.HTTP_200_OK)