from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from ..schemas.operation import UpdateOperation

from ..schemas import OperationResponse, CreateOperation, TextOperationCreate, ExtractedOperationResponse
from ..db.config import get_db
from ..services import OperationService, TextOperationService
from ..auth.dependencies import get_current_user

class OperationRoutes:
    def __init__(self):
        self.router = APIRouter(prefix="/operations")
        # `active-periods` is registered BEFORE `/{id}` so it is not captured
        # as a non-integer path segment (same-method collisions are resolved
        # by registration order).
        self.router.add_api_route("/active-periods", self.get_active_periods, methods=["GET"])
        self.router.add_api_route("/", self.get_operations, response_model=List[OperationResponse], methods=["GET"])
        self.router.add_api_route("/{id}", self.get_operation, response_model=OperationResponse, methods=["GET"])
        self.router.add_api_route("/new", self.create_operation, response_model=OperationResponse, methods=["POST"])
        self.router.add_api_route("/from-text", self.create_operation_from_text, response_model=ExtractedOperationResponse, methods=["POST"])
        self.router.add_api_route("/{id}", self.update_operation, response_model=OperationResponse, methods=["PUT"])
        self.router.add_api_route("/{id}", self.delete_operation, methods=["DELETE"])

    @staticmethod
    def get_active_periods(
        account_id: int = Query(gt=0),
        user: dict = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        """Fiscal months (newest first) holding at least one operation of the
        target account; drives the report's period selector."""
        operation_services = OperationService(db)
        return operation_services.get_active_periods(user['id'], account_id)

    @staticmethod
    def get_operations(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
        operation_services = OperationService(db)
        operations = operation_services.get_by_user(user['id'])
        return operations

    @staticmethod
    def get_operation(id: int, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
        operation_services = OperationService(db)
        operation = operation_services.get_by_user_and_id(user['id'], id)
        return operation

    @staticmethod
    def create_operation(operation: CreateOperation, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
        print({'operation_from_form_in_routes': operation.to_dict})
        print("--------------------REQUEST.STATE.USER-----------------")
        print(user)
        operation_services = OperationService(db)
        new_operation = operation_services.create_new(user['id'], operation)
        print(f"New operation with concept '{operation.concept}' was created successfully")
        return new_operation

    @staticmethod
    def create_operation_from_text(
        body: TextOperationCreate,
        user: dict = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        """Extract an operation from a free-text narration via the AI provider.

        Returns the validated `CreateOperation` payload so the frontend can show a
        confirmation form; the operation is NOT persisted here (the user confirms
        through `POST /operations/new`, which enforces balance/ownership rules)."""
        print(f"Narration '{body.text[:80]}...' for account {body.account_id}")
        text_service = TextOperationService(db)
        extracted = text_service.extract(user['id'], body.text, body.account_id)
        print(f"Narration extracted successfully: {extracted}")
        return extracted

    @staticmethod
    def update_operation(id: int, operation: UpdateOperation, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
        operation_services = OperationService(db)
        updated_operation = operation_services.update_by_user_and_id(user['id'], id, operation)
        return updated_operation

    @staticmethod
    def delete_operation(id: int, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
        operation_services = OperationService(db)
        deleted_operation = operation_services.delete_by_user_and_id(user['id'], id)
        return deleted_operation