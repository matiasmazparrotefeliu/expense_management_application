"""Business logic for user signup and login."""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse

from ..auth.security import Security
from ..models import User
from ..schemas import UserCreate, UserLogin

class User_Service():
    """Wraps the `User` queries and mutations exposed through `UserRoutes`."""

    def __init__(self, db: Session):
        self.db = db
        self.security= Security()

    def create_new(self, user: UserCreate):
        """Register a new user with a hashed password. No account is created here —
        the client creates one or more `Account` rows separately once logged in.
        Duplicate `name` or `email` (both unique) yields a 409."""
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
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with that name or email already exists",
            )
        self.db.refresh(new_user)
        new_user_dict = new_user.to_dict()
        new_user_dict.pop('_sa_instance_state', None)
        return JSONResponse(content=new_user_dict, status_code=status.HTTP_201_CREATED)

    def login(self, user: UserLogin):
        """Verify credentials for an active user and return the JWT plus the user profile.

        Accounts are eager-loaded before `to_dict()` so the profile is serialized
        while the session is still open (mirrors the middleware's `joinedload`).
        """
        user_ = (
            self.db.query(User)
            .options(joinedload(User.accounts))
            .filter(User.email == user.email, User.is_active == True)
            .first()
        )
        if not user_:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        verify_password = self.security.verify_passwords(user.password, user_.password)
        if not verify_password:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid credentials")
        print("-----------------USER FOUND----------------------")
        print(user_)
        token = self.security.create_access_token({"sub": str(user_.id)})
        return token, user_.to_dict()