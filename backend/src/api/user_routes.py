from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ..db.config import get_db
from ..services import User_Service
from ..schemas import UserCreate, UserResponse, UserLogin, LoginResponse

class UserRoutes:
    def __init__(self):
        self.router = APIRouter(prefix="/users")
        self.router.add_api_route("/new", self.create_new_user, response_model=UserResponse, methods=["POST"])
        self.router.add_api_route("/login", self.login, response_model=LoginResponse, methods=["POST"])

    @staticmethod
    def create_new_user(user: UserCreate, db: Session = Depends(get_db)):
        user_service = User_Service(db)
        new_user = user_service.create_new(user)
        print(f"User {user.name} was created successfully")
        return new_user
    
    @staticmethod
    def login(user: UserLogin, db: Session = Depends(get_db)):
        print({"user": user})
        user_service = User_Service(db)
        token, user_dict = user_service.login(user)
        print(f"User {user.email} was found")
        return JSONResponse(
            content={"access_token": token, "token_type": "bearer", "user": user_dict},
            status_code=status.HTTP_200_OK,
        )