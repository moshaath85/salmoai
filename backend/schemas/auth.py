from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    role: str = "user"
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    """Request body for user login."""
    username_or_email: str
    password: str


class RegisterRequest(BaseModel):
    """Request body for user registration (admin only)."""
    username: str
    email: str
    password: str
    name: Optional[str] = None
    role: str = "user"
    customer_id: Optional[int] = None


class ChangePasswordRequest(BaseModel):
    """Request body for changing password."""
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    """Response body for issued application token."""
    token: str
    token_type: str = "Bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    """Request body for forgot password."""
    email: str


class ResetPasswordRequest(BaseModel):
    """Request body for resetting password with token."""
    token: str
    new_password: str