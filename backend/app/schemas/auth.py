from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    email: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "agent"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True
