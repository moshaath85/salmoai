import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import bcrypt
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import create_access_token
from core.config import settings
from core.database import db_manager
from models.site_users import Site_users

logger = logging.getLogger(__name__)

# In-memory store for password reset tokens (MVP)
_reset_tokens: Dict[str, dict] = {}


def hash_password(password: str) -> str:
    """Hash a password using bcrypt (truncated to 72 bytes)."""
    truncated = password.encode("utf-8")[:72]
    return bcrypt.hashpw(truncated, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    truncated = plain_password.encode("utf-8")[:72]
    try:
        return bcrypt.checkpw(truncated, hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def authenticate_user(self, username_or_email: str, password: str) -> Optional[Site_users]:
        """Authenticate user by username or email and password."""
        result = await self.db.execute(
            select(Site_users).where(
                or_(
                    Site_users.username == username_or_email,
                    Site_users.email == username_or_email,
                )
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

        if user.is_active is False:
            return None

        # Update last_login
        user.last_login = datetime.now(timezone.utc).isoformat()
        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def issue_app_token(self, user: Site_users) -> Tuple[str, datetime, Dict[str, Any]]:
        """Generate application JWT token for the authenticated user."""
        try:
            expires_minutes = int(getattr(settings, "jwt_expire_minutes", 60))
        except (TypeError, ValueError):
            logger.warning("Invalid JWT_EXPIRE_MINUTES value; fallback to 60 minutes")
            expires_minutes = 60

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)

        claims: Dict[str, Any] = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
        }

        if user.name:
            claims["name"] = user.name
        if user.last_login:
            claims["last_login"] = user.last_login if isinstance(user.last_login, str) else user.last_login.isoformat()

        token = create_access_token(claims, expires_minutes=expires_minutes)
        return token, expires_at, claims

    async def create_user(
        self,
        username: str,
        email: str,
        password: str,
        name: Optional[str] = None,
        role: str = "user",
        customer_id: Optional[int] = None,
    ) -> Site_users:
        """Create a new user with hashed password."""
        hashed = hash_password(password)
        user = Site_users(
            username=username,
            email=email,
            password_hash=hashed,
            name=name or username,
            role=role,
            customer_id=customer_id,
            is_active=True,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def change_password(self, user_id: int, current_password: str, new_password: str) -> bool:
        """Change user password after verifying current password."""
        result = await self.db.execute(select(Site_users).where(Site_users.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            return False

        if not verify_password(current_password, user.password_hash):
            return False

        user.password_hash = hash_password(new_password)
        await self.db.commit()
        return True

    async def generate_reset_token(self, email: str) -> Optional[str]:
        """Generate a password reset token for the given email."""
        result = await self.db.execute(
            select(Site_users).where(Site_users.email == email)
        )
        user = result.scalar_one_or_none()

        if not user:
            return None

        # Generate a secure random token
        token = secrets.token_hex(32)

        # Store token with user_id and expiry (1 hour)
        _reset_tokens[token] = {
            "user_id": user.id,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        }

        logger.info(f"Generated reset token for user {user.id}")
        return token

    async def reset_password_with_token(self, token: str, new_password: str) -> bool:
        """Reset password using a valid reset token."""
        token_data = _reset_tokens.get(token)

        if not token_data:
            return False

        # Check if token is expired
        if datetime.now(timezone.utc) > token_data["expires_at"]:
            # Remove expired token
            del _reset_tokens[token]
            return False

        # Find user and update password
        user_id = token_data["user_id"]
        result = await self.db.execute(select(Site_users).where(Site_users.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            return False

        user.password_hash = hash_password(new_password)
        await self.db.commit()

        # Invalidate the token
        del _reset_tokens[token]

        logger.info(f"Password reset successful for user {user_id}")
        return True


async def initialize_admin_user():
    """Initialize default admin user if not exists."""
    if "MGX_IGNORE_INIT_ADMIN" in os.environ:
        logger.info("Ignore initialize admin")
        return

    from services.database import initialize_database

    # Ensure database is initialized first
    await initialize_database()

    async with db_manager.async_session_maker() as db:
        # Check if admin user already exists by username
        result = await db.execute(
            select(Site_users).where(Site_users.username == "admin")
        )
        existing_admin = result.scalar_one_or_none()

        if existing_admin:
            logger.info("Admin user already exists, skipping initialization")
            return

        # Create default admin user
        admin_user = Site_users(
            username="admin",
            email="admin@salmo.sa",
            password_hash=hash_password("Admin@123456"),
            name="مدير النظام",
            role="admin",
            is_active=True,
        )
        db.add(admin_user)
        await db.commit()
        logger.info("Created default admin user: admin@salmo.sa")