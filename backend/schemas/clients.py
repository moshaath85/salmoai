from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class ClientRegisterRequest(BaseModel):
    """Request body for client registration."""
    full_name: str
    company_name: str
    email: str
    mobile: str
    password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("كلمات المرور غير متطابقة")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("كلمة المرور يجب أن تكون 8 أحرف على الأقل")
        return v


class ClientResponse(BaseModel):
    """Response body for client info."""
    id: int
    company_name: str
    owner_name: str
    email: str
    mobile: str
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ClientRegisterResponse(BaseModel):
    """Response body for client registration."""
    token: str
    token_type: str = "Bearer"
    client: ClientResponse
    user: dict