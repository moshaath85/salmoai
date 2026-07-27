import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.coupon_usages import Coupon_usagesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/coupon_usages", tags=["coupon_usages"])


# ---------- Pydantic Schemas ----------
class Coupon_usagesData(BaseModel):
    """Entity data schema (for create/update)"""
    coupon_id: int
    coupon_code: str
    plan_id: int = None
    billing_cycle: str = None
    original_amount: float
    discount_amount: float
    final_amount: float
    applied_at: Optional[datetime] = None


class Coupon_usagesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    coupon_id: Optional[int] = None
    coupon_code: Optional[str] = None
    plan_id: Optional[int] = None
    billing_cycle: Optional[str] = None
    original_amount: Optional[float] = None
    discount_amount: Optional[float] = None
    final_amount: Optional[float] = None
    applied_at: Optional[datetime] = None


class Coupon_usagesResponse(BaseModel):
    """Entity response schema"""
    id: int
    coupon_id: int
    coupon_code: str
    user_id: str
    plan_id: Optional[int] = None
    billing_cycle: Optional[str] = None
    original_amount: float
    discount_amount: float
    final_amount: float
    applied_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Coupon_usagesListResponse(BaseModel):
    """List response schema"""
    items: List[Coupon_usagesResponse]
    total: int
    skip: int
    limit: int


class Coupon_usagesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Coupon_usagesData]


class Coupon_usagesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Coupon_usagesUpdateData


class Coupon_usagesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Coupon_usagesBatchUpdateItem]


class Coupon_usagesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Coupon_usagesListResponse)
async def query_coupon_usagess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query coupon_usagess with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying coupon_usagess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Coupon_usagesService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} coupon_usagess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying coupon_usagess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Coupon_usagesListResponse)
async def query_coupon_usagess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query coupon_usagess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying coupon_usagess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Coupon_usagesService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} coupon_usagess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying coupon_usagess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Coupon_usagesResponse)
async def get_coupon_usages(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single coupon_usages by ID (user can only see their own records)"""
    logger.debug(f"Fetching coupon_usages with id: {id}, fields={fields}")
    
    service = Coupon_usagesService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Coupon_usages with id {id} not found")
            raise HTTPException(status_code=404, detail="Coupon_usages not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching coupon_usages {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Coupon_usagesResponse, status_code=201)
async def create_coupon_usages(
    data: Coupon_usagesData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new coupon_usages"""
    logger.debug(f"Creating new coupon_usages with data: {data}")
    
    service = Coupon_usagesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create coupon_usages")
        
        logger.info(f"Coupon_usages created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating coupon_usages: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating coupon_usages: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Coupon_usagesResponse], status_code=201)
async def create_coupon_usagess_batch(
    request: Coupon_usagesBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple coupon_usagess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} coupon_usagess")
    
    service = Coupon_usagesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} coupon_usagess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Coupon_usagesResponse])
async def update_coupon_usagess_batch(
    request: Coupon_usagesBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple coupon_usagess in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} coupon_usagess")
    
    service = Coupon_usagesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} coupon_usagess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Coupon_usagesResponse)
async def update_coupon_usages(
    id: int,
    data: Coupon_usagesUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing coupon_usages (requires ownership)"""
    logger.debug(f"Updating coupon_usages {id} with data: {data}")

    service = Coupon_usagesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Coupon_usages with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Coupon_usages not found")
        
        logger.info(f"Coupon_usages {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating coupon_usages {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating coupon_usages {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_coupon_usagess_batch(
    request: Coupon_usagesBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple coupon_usagess by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} coupon_usagess")
    
    service = Coupon_usagesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} coupon_usagess successfully")
        return {"message": f"Successfully deleted {deleted_count} coupon_usagess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_coupon_usages(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single coupon_usages by ID (requires ownership)"""
    logger.debug(f"Deleting coupon_usages with id: {id}")
    
    service = Coupon_usagesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Coupon_usages with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Coupon_usages not found")
        
        logger.info(f"Coupon_usages {id} deleted successfully")
        return {"message": "Coupon_usages deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting coupon_usages {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")