import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.coupons import CouponsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/coupons", tags=["coupons"])


# ---------- Pydantic Schemas ----------
class CouponsData(BaseModel):
    """Entity data schema (for create)"""
    code: str
    discount: str
    discount_type: str
    coupon_type: Optional[str] = None
    applicable_plans: Optional[str] = None
    applicable_cycles: Optional[str] = None
    usage_count: Optional[int] = None
    max_uses: Optional[int] = None
    max_uses_per_user: Optional[int] = None
    min_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    trial_days: Optional[int] = None
    expires_at: Optional[str] = None
    starts_at: Optional[str] = None
    is_active: Optional[bool] = None
    stackable: Optional[bool] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None


class CouponsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    code: Optional[str] = None
    discount: Optional[str] = None
    discount_type: Optional[str] = None
    coupon_type: Optional[str] = None
    applicable_plans: Optional[str] = None
    applicable_cycles: Optional[str] = None
    usage_count: Optional[int] = None
    max_uses: Optional[int] = None
    max_uses_per_user: Optional[int] = None
    min_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    trial_days: Optional[int] = None
    expires_at: Optional[str] = None
    starts_at: Optional[str] = None
    is_active: Optional[bool] = None
    stackable: Optional[bool] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None


class CouponsResponse(BaseModel):
    """Entity response schema"""
    id: int
    code: str
    discount: str
    discount_type: str
    coupon_type: Optional[str] = None
    applicable_plans: Optional[str] = None
    applicable_cycles: Optional[str] = None
    usage_count: Optional[int] = None
    max_uses: Optional[int] = None
    max_uses_per_user: Optional[int] = None
    min_amount: Optional[float] = None
    max_discount_amount: Optional[float] = None
    trial_days: Optional[int] = None
    expires_at: Optional[str] = None
    starts_at: Optional[str] = None
    is_active: Optional[bool] = None
    stackable: Optional[bool] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CouponsListResponse(BaseModel):
    """List response schema"""
    items: List[CouponsResponse]
    total: int
    skip: int
    limit: int


class CouponsBatchCreateRequest(BaseModel):
    items: List[CouponsData]


class CouponsBatchUpdateItem(BaseModel):
    id: int
    updates: CouponsUpdateData


class CouponsBatchUpdateRequest(BaseModel):
    items: List[CouponsBatchUpdateItem]


class CouponsBatchDeleteRequest(BaseModel):
    ids: List[int]


class ValidateCouponRequest(BaseModel):
    code: str
    plan_id: int
    billing_cycle: str
    amount: float
    user_id: str


class ApplyCouponRequest(BaseModel):
    code: str
    plan_id: int
    billing_cycle: str
    amount: float
    user_id: str


# ---------- Routes ----------
@router.get("", response_model=CouponsListResponse)
async def query_coupons(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=2000),
    fields: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Query coupons with filtering, sorting, and pagination"""
    service = CouponsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(skip=skip, limit=limit, query_dict=query_dict, sort=sort)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying coupons: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=CouponsListResponse)
async def query_coupons_all(
    query: str = Query(None),
    sort: str = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=2000),
    fields: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Query coupons without user limitation"""
    service = CouponsService(db)
    try:
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(skip=skip, limit=limit, query_dict=query_dict, sort=sort)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying coupons: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/validate")
async def validate_coupon(
    data: ValidateCouponRequest,
    db: AsyncSession = Depends(get_db),
):
    """Validate a coupon code and return discount info"""
    service = CouponsService(db)
    try:
        result = await service.validate_coupon(
            code=data.code,
            plan_id=data.plan_id,
            billing_cycle=data.billing_cycle,
            amount=data.amount,
            user_id=data.user_id,
        )
        return result
    except Exception as e:
        logger.error(f"Error validating coupon: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/apply")
async def apply_coupon(
    data: ApplyCouponRequest,
    db: AsyncSession = Depends(get_db),
):
    """Apply a coupon and record usage"""
    service = CouponsService(db)
    try:
        result = await service.apply_coupon(
            code=data.code,
            plan_id=data.plan_id,
            billing_cycle=data.billing_cycle,
            amount=data.amount,
            user_id=data.user_id,
        )
        return result
    except Exception as e:
        logger.error(f"Error applying coupon: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/stats/{coupon_id}")
async def get_coupon_stats(
    coupon_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get usage statistics for a coupon"""
    service = CouponsService(db)
    try:
        result = await service.get_coupon_stats(coupon_id)
        return result
    except Exception as e:
        logger.error(f"Error getting coupon stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/usages")
async def get_usage_logs(
    coupon_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Get coupon usage logs"""
    service = CouponsService(db)
    try:
        result = await service.get_usage_logs(coupon_id=coupon_id, skip=skip, limit=limit)
        return result
    except Exception as e:
        logger.error(f"Error getting usage logs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=CouponsResponse)
async def get_coupons(
    id: int,
    fields: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get a single coupon by ID"""
    service = CouponsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            raise HTTPException(status_code=404, detail="Coupon not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching coupon {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=CouponsResponse, status_code=201)
async def create_coupons(
    data: CouponsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new coupon"""
    service = CouponsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create coupon")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating coupon: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[CouponsResponse], status_code=201)
async def create_coupons_batch(
    request: CouponsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple coupons"""
    service = CouponsService(db)
    results = []
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[CouponsResponse])
async def update_coupons_batch(
    request: CouponsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple coupons"""
    service = CouponsService(db)
    results = []
    try:
        for item in request.items:
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=CouponsResponse)
async def update_coupons(
    id: int,
    data: CouponsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing coupon"""
    service = CouponsService(db)
    try:
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            raise HTTPException(status_code=404, detail="Coupon not found")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating coupon {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_coupons_batch(
    request: CouponsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple coupons by their IDs"""
    service = CouponsService(db)
    deleted_count = 0
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        return {"message": f"Successfully deleted {deleted_count} coupons", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_coupons(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single coupon by ID"""
    service = CouponsService(db)
    try:
        success = await service.delete(id)
        if not success:
            raise HTTPException(status_code=404, detail="Coupon not found")
        return {"message": "Coupon deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting coupon {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")