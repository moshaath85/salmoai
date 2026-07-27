import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.packages import Packages

router = APIRouter(prefix="/api/v1/packages", tags=["packages-public"])
logger = logging.getLogger(__name__)


class PackagePublicResponse(BaseModel):
    """Public package response with parsed features."""
    id: int
    name: str
    price: float
    billing_cycle: str
    max_users: int
    features: List[str] = []
    status: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[PackagePublicResponse])
async def list_active_packages(db: AsyncSession = Depends(get_db)):
    """Public endpoint: Get all active packages."""
    result = await db.execute(
        select(Packages).where(Packages.status == "active").order_by(Packages.price)
    )
    packages = result.scalars().all()

    response = []
    for pkg in packages:
        features = []
        if pkg.features:
            try:
                features = json.loads(pkg.features)
            except (json.JSONDecodeError, TypeError):
                features = []

        response.append(PackagePublicResponse(
            id=pkg.id,
            name=pkg.name,
            price=pkg.price,
            billing_cycle=pkg.billing_cycle,
            max_users=pkg.max_users,
            features=features,
            status=pkg.status,
        ))

    return response


@router.get("/{package_id}", response_model=PackagePublicResponse)
async def get_package(package_id: int, db: AsyncSession = Depends(get_db)):
    """Public endpoint: Get a single package by ID."""
    result = await db.execute(
        select(Packages).where(Packages.id == package_id)
    )
    pkg = result.scalar_one_or_none()

    if not pkg:
        raise HTTPException(status_code=404, detail="الباقة غير موجودة")

    features = []
    if pkg.features:
        try:
            features = json.loads(pkg.features)
        except (json.JSONDecodeError, TypeError):
            features = []

    return PackagePublicResponse(
        id=pkg.id,
        name=pkg.name,
        price=pkg.price,
        billing_cycle=pkg.billing_cycle,
        max_users=pkg.max_users,
        features=features,
        status=pkg.status,
    )