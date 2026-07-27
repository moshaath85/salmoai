import logging
from typing import Optional

from core.database import get_db
from dependencies.auth import get_admin_user
from fastapi import APIRouter, Depends, HTTPException, Query, status
from models.site_users import Site_users
from schemas.auth import UserResponse
from services.auth import AuthService, hash_password
from services.site_users import Site_usersService
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/admin/users", tags=["admin-users"])
logger = logging.getLogger(__name__)


class AdminCreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    name: Optional[str] = None
    role: str = "user"
    customer_id: Optional[int] = None


class AdminUpdateUserRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    customer_id: Optional[int] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserListResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


def user_to_dict(user: Site_users) -> dict:
    """Convert Site_users model to response dict."""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "customer_id": user.customer_id,
        "is_active": user.is_active,
        "last_login": user.last_login,
        "created_at": str(user.created_at) if user.created_at else None,
        "updated_at": str(user.updated_at) if user.updated_at else None,
    }


@router.get("")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: UserResponse = Depends(get_admin_user),
):
    """List all users with pagination (admin only)."""
    service = Site_usersService(db)

    query_dict = {}
    if role:
        query_dict["role"] = role

    result = await service.get_list(skip=skip, limit=limit, query_dict=query_dict if query_dict else None)

    items = [user_to_dict(u) for u in result["items"]]

    # Apply search filter if provided (post-query for simplicity)
    if search:
        search_lower = search.lower()
        items = [
            u for u in items
            if search_lower in (u.get("username") or "").lower()
            or search_lower in (u.get("email") or "").lower()
            or search_lower in (u.get("name") or "").lower()
        ]

    return {
        "items": items,
        "total": result["total"],
        "skip": skip,
        "limit": limit,
    }


@router.get("/{user_id}")
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: UserResponse = Depends(get_admin_user),
):
    """Get a single user by ID (admin only)."""
    service = Site_usersService(db)
    user = await service.get_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود",
        )

    return user_to_dict(user)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: AdminCreateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: UserResponse = Depends(get_admin_user),
):
    """Create a new user (admin only)."""
    # Check if username or email already exists
    result = await db.execute(
        select(Site_users).where(
            or_(
                Site_users.username == payload.username,
                Site_users.email == payload.email,
            )
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً",
        )

    auth_service = AuthService(db)
    user = await auth_service.create_user(
        username=payload.username,
        email=payload.email,
        password=payload.password,
        name=payload.name,
        role=payload.role,
        customer_id=payload.customer_id,
    )

    return user_to_dict(user)


@router.put("/{user_id}")
async def update_user(
    user_id: int,
    payload: AdminUpdateUserRequest,
    db: AsyncSession = Depends(get_db),
    admin: UserResponse = Depends(get_admin_user),
):
    """Update a user (admin only)."""
    service = Site_usersService(db)
    user = await service.get_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود",
        )

    update_data = {}
    if payload.username is not None:
        update_data["username"] = payload.username
    if payload.email is not None:
        update_data["email"] = payload.email
    if payload.name is not None:
        update_data["name"] = payload.name
    if payload.role is not None:
        update_data["role"] = payload.role
    if payload.customer_id is not None:
        update_data["customer_id"] = payload.customer_id
    if payload.is_active is not None:
        update_data["is_active"] = payload.is_active
    if payload.password is not None:
        update_data["password_hash"] = hash_password(payload.password)

    if update_data:
        updated_user = await service.update(user_id, update_data)
        return user_to_dict(updated_user)

    return user_to_dict(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: UserResponse = Depends(get_admin_user),
):
    """Delete a user (admin only)."""
    service = Site_usersService(db)
    success = await service.delete(user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود",
        )

    return {"message": "تم حذف المستخدم بنجاح"}