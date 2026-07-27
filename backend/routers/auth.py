import logging

from core.database import get_db
from dependencies.auth import get_current_user
from fastapi import APIRouter, Depends, HTTPException, status
from schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from services.auth import AuthService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])
logger = logging.getLogger(__name__)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user with username/email and password, return JWT token."""
    auth_service = AuthService(db)
    user = await auth_service.authenticate_user(payload.username_or_email, payload.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token, expires_at, claims = await auth_service.issue_app_token(user)

    return TokenResponse(
        token=token,
        token_type="Bearer",
        user=UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=user.role,
            last_login=None,
        ),
    )


@router.post("/register", response_model=UserResponse)
async def register(
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Register a new user (admin only)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="يتطلب صلاحيات المدير",
        )

    from sqlalchemy import select, or_
    from models.site_users import Site_users

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

    return UserResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        role=user.role,
        last_login=None,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current authenticated user info."""
    return current_user


@router.post("/logout")
async def logout():
    """Logout user (client-side token clearing)."""
    return {"message": "تم تسجيل الخروج بنجاح"}


@router.put("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change current user's password."""
    auth_service = AuthService(db)
    success = await auth_service.change_password(
        user_id=int(current_user.id),
        current_password=payload.current_password,
        new_password=payload.new_password,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور الحالية غير صحيحة",
        )

    return {"message": "تم تغيير كلمة المرور بنجاح"}


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request a password reset token. For MVP, returns the token directly."""
    auth_service = AuthService(db)
    token = await auth_service.generate_reset_token(payload.email)

    if not token:
        # Don't reveal if email exists or not for security
        return {
            "message": "إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رابط إعادة تعيين كلمة المرور",
            "reset_token": None,
        }

    return {
        "message": "تم إنشاء رابط إعادة تعيين كلمة المرور",
        "reset_token": token,
    }


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a valid reset token."""
    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="كلمة المرور يجب أن تكون 8 أحرف على الأقل",
        )

    auth_service = AuthService(db)
    success = await auth_service.reset_password_with_token(payload.token, payload.new_password)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="رمز إعادة التعيين غير صالح أو منتهي الصلاحية",
        )

    return {"message": "تم إعادة تعيين كلمة المرور بنجاح"}