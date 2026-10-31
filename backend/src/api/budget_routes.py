"""Routes for the monthly budget limits and the salary-consumption summary.

All endpoints are authenticated; ownership of every limit is enforced directly
in the service (limits are never created from client-supplied `user_id`)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..schemas import BudgetLimitCreate
from ..db.config import get_db
from ..services import BudgetService
from ..auth.dependencies import get_current_user

class BudgetRoutes:
    """Registers `/budgets`: per-account, month/year-scoped summary, cap
    management (upsert and removal) and the per-period limit listing."""

    def __init__(self):
        self.router = APIRouter(prefix="/budgets")
        self.router.add_api_route("/summary", self.monthly_summary, methods=["GET"])
        self.router.add_api_route("/", self.list_limits, methods=["GET"])
        self.router.add_api_route("/", self.save_limit, methods=["POST"])
        self.router.add_api_route("/{limit_id}", self.delete_limit, methods=["DELETE"])

    @staticmethod
    def monthly_summary(
        account_id: int = Query(gt=0),
        year: int = Query(ge=1900, le=2100),
        month: int = Query(ge=1, le=12),
        user: dict = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        """Monthly analytics of one owned account: salary budget vs consumption,
        net remainder and the per-category breakdown with limit progress."""
        budget_services = BudgetService(db)
        return budget_services.monthly_summary(user['id'], year, month, account_id)

    @staticmethod
    def list_limits(
        account_id: int = Query(gt=0),
        year: int = Query(ge=1900, le=2100),
        month: int = Query(ge=1, le=12),
        user: dict = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        """Every cap configured by the user for the given account/period."""
        budget_services = BudgetService(db)
        return budget_services.get_limits(user['id'], year, month, account_id)

    @staticmethod
    def save_limit(
        body: BudgetLimitCreate,
        user: dict = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        """Create or update (upsert) a cap for the period; `category_id: None`
        is the global cap."""
        budget_services = BudgetService(db)
        return budget_services.save_limit(user['id'], body)

    @staticmethod
    def delete_limit(limit_id: int, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
        budget_services = BudgetService(db)
        return budget_services.delete_limit(user['id'], limit_id)
