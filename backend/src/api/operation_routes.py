from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..schemas import OperationResponse, CreateOperation, TextOperationCreate, ExtractedOperationResponse
from ..db.config import get_db
from ..services import OperationService, TextOperationService
from ..auth.dependencies import get_current_user

class OperationRoutes:
    def __init__(self):
        self.router = APIRouter(prefix="/operations")
        self.router.add_api_route("/", self.get_operations, response_model=List[OperationResponse], methods=["GET"])
        self.router.add_api_route("/{id}", self.get_operation, response_model=OperationResponse, methods=["GET"])
        self.router.add_api_route("/new", self.create_operation, response_model=OperationResponse, methods=["POST"])
        self.router.add_api_route("/from-text", self.create_operation_from_text, response_model=ExtractedOperationResponse, methods=["POST"])

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