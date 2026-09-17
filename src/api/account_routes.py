"""Routes for listing and creating the authenticated user's accounts."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..schemas import AccountResponse, AccountCreate
from ..db.config import get_db
from ..services import AccountService
from ..auth.dependencies import get_current_user

class AccountRoutes:
    """Registers `GET /accounts/` and `POST /accounts/new`. Both require a valid
    `Authorization` header, set by `LoadUserData`."""

    def __init__(self):
        self.router = APIRouter(prefix="/accounts")
        self.router.add_api_route("/", self.get_accounts, response_model=List[AccountResponse], methods=["GET"])
        self.router.add_api_route("/new", self.create_account, response_model=AccountResponse, methods=["POST"])

    @staticmethod
    def get_accounts(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
        """List the authenticated user's own accounts."""
        account_service = AccountService(db)
        accounts = account_service.get_by_user(user['id'])
        return accounts

    @staticmethod
    def create_account(account: AccountCreate, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
        """Create a new account owned by the authenticated user."""
        account_service = AccountService(db)
        new_account = account_service.create_new(user['id'], account)
        return new_account
