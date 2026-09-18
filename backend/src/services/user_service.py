"""Business logic for user signup, login and lookup."""

import json
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse

from ..auth.security import Security
from ..models import User
from ..schemas import UserCreate, UserLogin, UserResponse

class User_Service():
    """Wraps the `User` queries and mutations exposed through `UserRoutes`."""

    def __init__(self, db: Session):
        self.db = db
        self.security= Security()

    def get_all(self) -> UserResponse:
        """List active users with their accounts eagerly loaded."""
        users = self.db.query(User).options(joinedload(User.accounts)).filter(User.is_active == True).all()
        users_dict = [user.to_dict() for user in users]
        print({'users_list': users_dict})
        print({'users_dict': users_dict})
        return JSONResponse(content=users_dict, status_code=status.HTTP_200_OK)

    def get_by_id(self, id: int):
        """Fetch a single active user by id, 404 if missing or inactive."""
        user = self.db.query(User).options(joinedload(User.accounts)).filter(User.id == id, User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        user_dict = user.to_dict()
        user_dict.pop('_sa_instance_state', None)
        print({'user_list': user_dict})
        return JSONResponse(content=user_dict, status_code=status.HTTP_200_OK)

    def create_new(self, user: UserCreate):
        """Register a new user with a hashed password. No account is created here —
        the client creates one or more `Account` rows separately once logged in.
        Duplicate `name` or `email` (both unique) yields a 400."""
        if not user.name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not valid username was pass")
        if not user.email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not valid email was pass")
        if not user.password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not valid password was pass")
        hashed_password = self.security.hash_password(user.password)
        new_user = User(name=user.name, email=user.email, password=hashed_password)
        print({'new_user': new_user})
        self.db.add(new_user)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with that name or email already exists",
            )
        self.db.refresh(new_user)
        new_user_dict = new_user.to_dict()
        new_user_dict.pop('_sa_instance_state', None)
        return JSONResponse(content=new_user_dict, status_code=status.HTTP_201_CREATED)

    def login(self, user: UserLogin):
        """Verify credentials for an active user and return a signed JWT."""
        user_ = self.db.query(User).filter(User.email == user.email, User.is_active == True).first()
        if not user_:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        verify_password = self.security.verify_passwords(user.password, user_.password)
        if not verify_password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid credentials")
        print("-----------------USER FOUND----------------------")
        print(user_)
        token = self.security.create_access_token({"sub": str(user_.id)})
        return token