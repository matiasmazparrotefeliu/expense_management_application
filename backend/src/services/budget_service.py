"""Business logic for monthly budget limits and the salary-consumption summary.

The summary is the analytical core of the module: it aggregates the **selected
account's** operations of a fiscal period (calendar month) into the salary
budget (income coming from categories flagged as `is_budget_source`), the total
consumption (`expense` + `transfer` both debit the budget), the net remainder
and the progress of the configured spending limits (global and per category).

Everything is scoped to a single account on purpose: operations snapshot the
account's currency, so per-account aggregation keeps every total (and the
limits compared against them) in exactly one currency."""

import datetime

from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse

from ..models import Account, BudgetLimit, Category, Operation, OperationType
from ..schemas import BudgetLimitCreate
from .operation_service import OperationService


class BudgetService():
    """Wraps the `BudgetLimit` management and the monthly summary calculation
    exposed through `BudgetRoutes`."""

    def __init__(self, db: Session):
        self.db = db

    def _get_owned_account(self, user_id: int, account_id: int) -> Account:
        """Ownership check through the centralized `OperationService`
        helper (404 when missing, 403 when foreign) — never re-implemented here."""
        return OperationService(self.db).get_owned_account(user_id, account_id)

    def _period_bounds(self, year: int, month: int):
        """Half-open [start, end) datetime range covering the fiscal month —
        the same `Operation.date` (server-generated) cutoff every aggregate uses."""
        start = datetime.datetime(year, month, 1)
        if month == 12:
            end = datetime.datetime(year + 1, 1, 1)
        else:
            end = datetime.datetime(year, month + 1, 1)
        return start, end

    def _account_operations_query(self, account_id: int, year: int, month: int):
        """Every operation of the target account inside the fiscal period."""
        start, end = self._period_bounds(year, month)
        return (
            self.db.query(Operation)
            .filter(
                Operation.account_id == account_id,
                Operation.date >= start,
                Operation.date < end,
            )
        )

    def _sum_for_types(self, account_id: int, year: int, month: int, operation_types) -> float:
        """Sum of the account's amounts for the given operation types within the
        period (0 when empty).

        The result is cast to `float` right away: `Operation.amount` is a
        `Numeric` column (SQLAlchemy returns `Decimal`), and neither mixing it
        in float arithmetic nor `json.dumps`-ing it survives."""
        value = (
            self._account_operations_query(account_id, year, month)
            .filter(Operation.type.in_(operation_types))
            .with_entities(func.coalesce(func.sum(Operation.amount), 0.0))
            .scalar()
        )
        return float(value)

    def _sum_salary(self, account_id: int, year: int, month: int) -> float:
        """Sum of the account's income operations whose category is a budget
        source — the monthly "salary" the expenses consume. Bank capitalizations
        and other incomes from non-flagged categories are excluded from the
        budget (cast to `float` like `_sum_for_types`, see its docstring)."""
        start, end = self._period_bounds(year, month)
        value = (
            self.db.query(func.coalesce(func.sum(Operation.amount), 0.0))
            .join(Category, Operation.category_id == Category.id)
            .filter(
                Operation.account_id == account_id,
                Operation.date >= start,
                Operation.date < end,
                Operation.type == OperationType.income,
                Category.is_budget_source == True,
            )
            .scalar()
        )
        return float(value)

    def _limits_map(self, user_id: int, account_id: int, year: int, month: int) -> dict:
        """Configured limits of the account/period indexed by category id,
        minus the global one (`category_id IS None`)."""
        rows = (
            self.db.query(BudgetLimit)
            .filter(
                BudgetLimit.user_id == user_id,
                BudgetLimit.account_id == account_id,
                BudgetLimit.year == year,
                BudgetLimit.month == month,
                BudgetLimit.category_id.isnot(None),
            )
            .all()
        )
        return {row.category_id: row for row in rows}

    def _limit_snapshot(self, limit: BudgetLimit, used: float) -> dict:
        """Progress of a configured limit against its actual consumption."""
        percentage = round((used / float(limit.amount)) * 100, 2) if limit.amount else None
        return {
            "id": limit.id,
            "amount": float(limit.amount),
            "used": used,
            "percentage": percentage,
        }

    def monthly_summary(self, user_id: int, year: int, month: int, account_id: int):
        """Build the full monthly snapshot for one owned account: salary budget,
        consumption, net remainder, global-limit progress and the per-category
        expense breakdown (each with its own limit progress when configured).
        Foreign/unknown accounts raise 403/404 through the ownership helper."""
        account = self._get_owned_account(user_id, account_id)

        total_income = self._sum_for_types(account.id, year, month, [OperationType.income])
        total_salary = self._sum_salary(account.id, year, month)
        total_expenses = self._sum_for_types(
            account.id, year, month, [OperationType.expense, OperationType.transfer]
        )
        net_available = total_salary - total_expenses
        consumption_percentage = (
            round((total_expenses / total_salary) * 100, 2) if total_salary else None
        )

        global_limit_row = (
            self.db.query(BudgetLimit)
            .filter(
                BudgetLimit.user_id == user_id,
                BudgetLimit.account_id == account.id,
                BudgetLimit.year == year,
                BudgetLimit.month == month,
                BudgetLimit.category_id.is_(None),
            )
            .first()
        )

        breakdown_rows = (
            self._account_operations_query(account.id, year, month)
            .filter(Operation.type != OperationType.income)
            .join(Category, Operation.category_id == Category.id)
            .with_entities(
                Category.id,
                Category.name,
                Category.type,
                func.sum(Operation.amount).label("total"),
                func.count(Operation.id).label("count"),
            )
            .group_by(Category.id, Category.name, Category.type)
            .order_by(func.sum(Operation.amount).desc())
            .all()
        )
        limits_map = self._limits_map(user_id, account.id, year, month)

        categories = []
        for category_id, category_name, category_type, total, count in breakdown_rows:
            amount = float(total)
            limit_row = limits_map.get(category_id)
            categories.append({
                "category_id": category_id,
                "category_name": category_name,
                "type": category_type.value,
                "amount": amount,
                "count": count,
                "percentage": round(float((amount / total_expenses) * 100), 2) if total_expenses else 0.0,
                "limit": self._limit_snapshot(limit_row, amount) if limit_row else None,
            })

        summary = {
            "account_id": account.id,
            "currency": account.currency,
            "year": year,
            "month": month,
            "total_income": total_income,
            "total_salary": total_salary,
            "total_expenses": total_expenses,
            "net_available": net_available,
            "consumption_percentage": consumption_percentage,
            "global_limit": (
                self._limit_snapshot(global_limit_row, total_expenses)
                if global_limit_row else None
            ),
            "categories": categories,
        }
        return JSONResponse(content=summary, status_code=status.HTTP_200_OK)

    def get_limits(self, user_id: int, year: int, month: int, account_id: int):
        """List every configured limit of the account for the period (global
        included). Foreign/unknown accounts raise 403/404."""
        account = self._get_owned_account(user_id, account_id)
        rows = (
            self.db.query(BudgetLimit)
            .filter(
                BudgetLimit.user_id == user_id,
                BudgetLimit.account_id == account.id,
                BudgetLimit.year == year,
                BudgetLimit.month == month,
            )
            .order_by(BudgetLimit.category_id.is_(None), BudgetLimit.id)
            .all()
        )
        limits_dict = [row.to_dict() for row in rows]
        return JSONResponse(content=limits_dict, status_code=status.HTTP_200_OK)

    def save_limit(self, user_id: int, payload: BudgetLimitCreate):
        """Create or update a monthly cap (upsert keyed by user + account +
        period + category).

        The account must be owned (404/403 via the ownership helper). The
        global cap is the row with `category_id = None`. Category caps must
        reference an active category that is not an income one (income never
        consumes a budget, capping it would be meaningless). Re-saving an
        existing cap updates its amount, so the client does not need to track
        ids; this also keeps the global cap unique without relying on a unique
        index over a NULLable column."""
        account = self._get_owned_account(user_id, payload.account_id)
        category = None
        if payload.category_id is not None:
            category = self.db.query(Category).filter(
                Category.id == payload.category_id, Category.is_active == True
            ).first()
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The category with id {payload.category_id} does not exist or is inactive.",
                )
            if category.type == OperationType.income:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Income categories cannot have a spending limit.",
                )

        try:
            query = self.db.query(BudgetLimit).filter(
                BudgetLimit.user_id == user_id,
                BudgetLimit.account_id == account.id,
                BudgetLimit.year == payload.year,
                BudgetLimit.month == payload.month,
            )
            if payload.category_id is None:
                query = query.filter(BudgetLimit.category_id.is_(None))
            else:
                query = query.filter(BudgetLimit.category_id == payload.category_id)

            limit = query.one_or_none()
            if limit:
                limit.amount = Decimal(str(payload.amount))
            else:
                limit = BudgetLimit(
                    user_id=user_id,
                    account_id=account.id,
                    category_id=payload.category_id,
                    amount=Decimal(str(payload.amount)),
                    month=payload.month,
                    year=payload.year,
                )
                self.db.add(limit)
            self.db.commit()
            self.db.refresh(limit)
        except Exception:
            self.db.rollback()
            raise

        print(f"Budget limit saved for user {user_id} "
              f"(account={account.id}, category={payload.category_id}, "
              f"period={payload.year}-{payload.month:02d})")
        return JSONResponse(content=limit.to_dict(), status_code=status.HTTP_200_OK)

    def delete_limit(self, user_id: int, limit_id: int):
        """Remove a configured cap. Foreign and nonexistent ids both return 404,
        mirroring `OperationService.get_by_user_and_id`."""
        try:
            limit = self.db.query(BudgetLimit).filter(
                BudgetLimit.user_id == user_id, BudgetLimit.id == limit_id
            ).first()
            if not limit:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Budget limit not found"
                )
            self.db.delete(limit)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        return JSONResponse(
            content={"detail": "Budget limit deleted successfully"},
            status_code=status.HTTP_200_OK,
        )
