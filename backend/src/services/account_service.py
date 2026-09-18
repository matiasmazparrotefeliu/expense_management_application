"""Business logic for creating and listing user accounts."""

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse

from ..models import Account
from ..schemas import AccountCreate

class AccountService():
    """Wraps the `Account` queries and mutations exposed through `AccountRoutes`.
    Every method is scoped to a single `user_id` — accounts are never listed or
    created across users."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_user(self, user_id: int):
        """List the caller's own active accounts."""
        accounts = self.db.query(Account).filter(Account.user_id == user_id, Account.is_active == True).all()
        accounts_dict = [account.to_dict() for account in accounts]
        return JSONResponse(content=accounts_dict, status_code=status.HTTP_200_OK)

    def create_new(self, user_id: int, account: AccountCreate):
        """Create a new zero-balance account for the caller. Fails with 400 if the
        user already has an account with the same name (enforced by a DB unique constraint)."""
        new_account = Account(name=account.name, currency=account.currency, user_id=user_id)
        self.db.add(new_account)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An account named '{account.name}' already exists for this user",
            )
        self.db.refresh(new_account)
        return JSONResponse(content=new_account.to_dict(), status_code=status.HTTP_201_CREATED)