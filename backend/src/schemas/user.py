"""Pydantic schemas for user signup, login and read responses."""

from pydantic import BaseModel

from .account import AccountResponse

class UserCreate(BaseModel):
    """Signup payload. Balance is intentionally absent — money lives in `Account` rows."""

    name: str
    email: str
    password: str

    def to_dict(self):
        return self.dict()

class UserResponse(BaseModel):
    """User read model, including the caller's own accounts."""

    id: int
    name: str
    email: str
    is_active: bool
    accounts: list[AccountResponse] = []

    class Config:
        from_attributes = True

    def to_dict(self):
        return self.dict()

class UserLogin(BaseModel):
    """Login payload."""

    email: str
    password: str

    def to_dict(self):
        return self.dict()

class TokenResponse(BaseModel):
    """JWT access token returned on successful login."""

    access_token: str
    token_type: str