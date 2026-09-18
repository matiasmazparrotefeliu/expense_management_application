"""Routes for listing the predefined categories catalog."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..schemas import CategoryResponse
from ..db.config import get_db
from ..services import CategoryService

class CategoryRoutes:
    """Registers `GET /categories/`, used by clients to obtain a valid `category_id`
    before creating an operation. Read-only and unauthenticated by design."""

    def __init__(self):
        self.router = APIRouter(prefix="/categories")
        self.router.add_api_route("/", self.get_categories, response_model=List[CategoryResponse], methods=["GET"])

    @staticmethod
    def get_categories(db: Session = Depends(get_db)):
        """List every active predefined category."""
        category_service = CategoryService(db)
        categories = category_service.get_all()
        return categories