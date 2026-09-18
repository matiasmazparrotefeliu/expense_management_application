from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List

from ..db.config import get_db
from ..services import User_Service
from ..schemas import UserCreate, UserResponse, UserLogin

class UserRoutes:
    def __init__(self):
        self.router = APIRouter(prefix="/users")
        self.router.add_api_route("/", self.get_users, response_model=List[UserResponse], methods=["GET"])
        self.router.add_api_route("/{id}", self.get_user_by_id, response_model=UserResponse, methods=["GET"])
        self.router.add_api_route("/new", self.create_new_user, response_model=UserResponse, methods=["POST"])
        self.router.add_api_route("/login", self.login, response_model=UserResponse, methods=["POST"])

    @staticmethod
    def get_users(db: Session = Depends(get_db)):
        user_service = User_Service(db)
        users = user_service.get_all()
        return users
    
    @staticmethod
    def get_user_by_id(id: int, db: Session = Depends(get_db)):
        user_service = User_Service(db)
        user = user_service.get_by_id(id)
        return user
    
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
        token = user_service.login(user)
        print(f"User {user.email} was found")
        return JSONResponse(content={"access_token": token, "token_type": "bearer"}, status_code=status.HTTP_200_OK)