"""Business logic for recording operations and keeping account balances in sync."""

from decimal import Decimal

from sqlalchemy.orm import Session
from sqlalchemy import and_, extract
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse

from ..models import Operation, OperationType, Account, Category
from ..schemas import CreateOperation, UpdateOperation
from ..core.operation_types import normalize_operation_type


class OperationService():
    """Wraps the `Operation` queries and the balance-affecting create flow
    exposed through `OperationRoutes`."""

    def __init__(self, db: Session):
        self.db = db

    def _normalize_type(self, raw_type: str) -> OperationType:
        """Resolve a client-supplied type string to an `OperationType`, 400 if unrecognized."""
        try:
            return normalize_operation_type(raw_type)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    def _signed_delta(self, operation_type: OperationType, amount) -> Decimal:
        """Balance effect of an operation: credits `income` (+amount), debits
        `expense` and `transfer` (-amount) — the single source of truth shared by
        `create_new`, `update_by_user_and_id` and `delete_by_user_and_id`."""
        return Decimal(str(amount)) if operation_type == OperationType.income else -Decimal(str(amount))

    def get_owned_account(self, user_id: int, account_id: int, lock: bool = False) -> Account:
        """Fetch an account enforcing ownership: 404 when missing, 403 when it belongs
        to another user. Pass `lock=True` right before mutating the balance so the
        row stays consistent under concurrent writes (`with_for_update`; a no-op on
        SQLite). Callers must NOT hold the lock across slow work (e.g. AI calls)."""
        query = self.db.query(Account).filter(Account.id == account_id)
        if lock:
            query = query.with_for_update()
        account = query.first()
        if not account:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
        if account.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account does not belong to the authenticated user",
            )
        return account

    def get_by_user(self, user_id: int):
        """List every operation across all of the user's accounts, newest first."""
        operations = (
            self.db.query(Operation)
            .join(Account)
            .filter(Account.user_id == user_id)
            .order_by(Operation.date.desc(), Operation.id.desc())
            .all()
        )
        operations_dict = [operation.to_dict() for operation in operations]
        return JSONResponse(content=operations_dict, status_code=status.HTTP_200_OK)

    def get_by_user_and_id(self, user_id: int, id: int):
        """Fetch a single operation, scoped to accounts owned by the user."""
        operation = self.db.query(Operation).join(Account).filter(
            and_(Account.user_id == user_id, Operation.id == id)
        ).first()
        if not operation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operation not found")
        return JSONResponse(content=operation.to_dict(), status_code=status.HTTP_200_OK)

    def get_active_periods(self, user_id: int, account_id: int):
        """List the fiscal periods (year/month, newest first) that contain at
        least one operation of the target account.

        The monthly summary is deterministic (empty month = zero totals) and —
        like the summary itself — scoped to a single account, so the report's
        period selector is driven by this endpoint instead of a fixed calendar:
        only months that actually have operations on the selected account are
        selectable, and every period shares the account's currency. Foreign or
        unknown accounts raise 403/404 via the ownership helper. `extract(year/
        month)` crosses dialects (SQLite/MySQL/PostgreSQL), unlike `strftime`/
        `DATE_FORMAT`/`to_char`."""
        account = self.get_owned_account(user_id, account_id)
        year = extract("year", Operation.date)
        month = extract("month", Operation.date)
        rows = (
            self.db.query(year, month)
            .filter(Operation.account_id == account.id)
            .distinct()
            .order_by(year.desc(), month.desc())
            .all()
        )
        periods = [{"year": int(row[0]), "month": int(row[1])} for row in rows]
        return JSONResponse(content=periods, status_code=status.HTTP_200_OK)

    def create_new(self, user_id: int, operation: CreateOperation):
        """Create an operation and apply its effect to the target account's balance.

        Locks the account row (`with_for_update`) for the duration of the balance
        update to avoid lost updates under concurrent writes — this only provides
        real row locking on MySQL; SQLite (used in tests/dev) ignores it. Rejects
        the operation with 403 if the account doesn't belong to the caller, and
        with 400 if a debit would leave the balance at or below zero (the balance
        must always stay strictly greater than the debited amount). `transfer`
        operations debit the account like `expense`. If `name` is omitted on a
        `transfer` operation it defaults to "Other". When the payload carries a
        `currency`, it must match the account's currency (400 otherwise); when
        omitted, the account's currency is snapshotted onto the operation. The
        category must belong to the same `OperationType` as the operation (400
        otherwise, e.g. an `Expense` category used on an `income` operation).
        """
        category = self.db.query(Category).filter(
            Category.id == operation.category_id, Category.is_active == True
        ).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The category with id {operation.category_id} does not exist or is inactive.",
            )

        op_type = self._normalize_type(operation.type)
        if category.type != op_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The category '{category.name}' is of type {category.type.value} but "
                       f"the operation is of type {op_type.value}.",
            )

        try:
            account = self.get_owned_account(user_id, operation.account_id, lock=True)
            if operation.currency and operation.currency.upper() != account.currency.upper():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Currency mismatch: the operation is in {operation.currency.upper()} "
                           f"but the account operates in {account.currency.upper()}",
                )

            amount = Decimal(str(operation.amount))
            new_balance = account.balance + self._signed_delta(op_type, amount)
            if new_balance <= 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient balance")

            name = operation.name or ("Other" if op_type == OperationType.transfer else None)

            new_operation = Operation(
                concept=operation.concept,
                amount=amount,
                type=op_type,
                currency=(operation.currency or account.currency).upper(),
                account_id=account.id,
                category_id=category.id,
                name=name,
            )
            account.balance = new_balance
            self.db.add(new_operation)
            self.db.commit()
            self.db.refresh(new_operation)
        except Exception:
            self.db.rollback()
            raise

        return JSONResponse(content=new_operation.to_dict(), status_code=status.HTTP_201_CREATED)

    def delete_by_user_and_id(self, user_id: int, id: int):
        """Delete an operation and reverse its effect on the target account's balance.

        Locks the account row (`with_for_update`) for the duration of the balance
        update to avoid lost updates under concurrent writes — this only provides
        real row locking on MySQL; SQLite (used in tests/dev) ignores it. Rejects
        the deletion with 403 if the operation doesn't belong to an account owned
        by the caller, and with 400 if reversing the operation would leave the
        balance at or below zero (the balance must always stay strictly greater
        than the debited amount). `transfer` operations are reversed like `expense`.
        """
        try:
            operation = self.db.query(Operation).join(Account).filter(
                and_(Account.user_id == user_id, Operation.id == id)
            ).first()
            if not operation:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operation not found")

            account = self.get_owned_account(user_id, operation.account_id, lock=True)

            new_balance = account.balance - self._signed_delta(operation.type, operation.amount)
            if new_balance <= 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient balance to reverse operation")

            account.balance = new_balance
            self.db.delete(operation)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

        return JSONResponse(content={"detail": "Operation deleted successfully"}, status_code=status.HTTP_200_OK)

    def update_by_user_and_id(self, user_id: int, id: int, operation_data: UpdateOperation):
        """Update an operation and adjust the target account's balance accordingly.

        Locks the account row (`with_for_update`) for the duration of the balance
        update to avoid lost updates under concurrent writes — this only provides
        real row locking on MySQL; SQLite (used in tests/dev) ignores it. Rejects
        the update with 403 if the operation doesn't belong to an account owned
        by the caller, and with 400 if adjusting the operation would leave the
        balance at or below zero (the balance must always stay strictly greater
        than the debited amount). `transfer` operations are adjusted like `expense`.
        Cross-account moves are not supported: `UpdateOperation.account_id`, when
        supplied, is ignored and the operation stays on its current account.
        """
        try:
            operation = self.db.query(Operation).join(Account).filter(
                and_(Account.user_id == user_id, Operation.id == id)
            ).first()
            if not operation:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operation not found")

            account = self.get_owned_account(user_id, operation.account_id, lock=True)

            # 1. Revert the current operation's balance effect first (its inverse)
            current_balance = account.balance - self._signed_delta(operation.type, operation.amount)

            # 2. Resolve the new values: amount/type come from the payload when
            # supplied, otherwise the stored operation is kept.
            new_amount = Decimal(str(operation_data.amount)) if operation_data.amount is not None else operation.amount
            new_type = self._normalize_type(operation_data.type) if operation_data.type is not None else operation.type
            
            # Validate category if provided or if type changed (category must match type)
            category_id = operation_data.category_id if operation_data.category_id is not None else operation.category_id
            category = self.db.query(Category).filter(
                Category.id == category_id, Category.is_active == True
            ).first()
            
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The category with id {category_id} does not exist or is inactive.",
                )
            if category.type != new_type:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The category '{category.name}' is of type {category.type.value} but "
                           f"the operation is of type {new_type.value}.",
                )

            # 3. Apply the new operation's balance effect and validate the result
            final_balance = current_balance + self._signed_delta(new_type, new_amount)

            if final_balance <= 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient balance to apply update")

            # Update operation fields
            if operation_data.concept is not None:
                operation.concept = operation_data.concept
            operation.amount = new_amount
            operation.type = new_type
            operation.category_id = category.id
            
            if operation_data.currency is not None:
                if operation_data.currency.upper() != account.currency.upper():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Currency mismatch: the updated currency is {operation_data.currency.upper()} "
                               f"but the account operates in {account.currency.upper()}",
                    )
                operation.currency = operation_data.currency.upper()
            
            if operation_data.name is not None:
                operation.name = operation_data.name
            elif new_type == OperationType.transfer and operation.name is None:
                operation.name = "Other"

            account.balance = final_balance
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
        return JSONResponse(content={"detail": "Operation updated successfully"}, status_code=status.HTTP_200_OK)