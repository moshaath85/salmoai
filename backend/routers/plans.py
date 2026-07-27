import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.plans import PlansService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/plans", tags=["plans"])


# ---------- Pydantic Schemas ----------
class PlansData(BaseModel):
    """Entity data schema (for create/update)"""
    name_ar: str
    name_en: str
    description_ar: str = None
    description_en: str = None
    price_monthly: float
    price_yearly: float = None
    price_lifetime: float = None
    billing_type: str = None
    features: str = None
    limits: str = None
    trial_days: int = None
    status: str
    is_recommended: bool = None
    sort_order: int
    color: str = None
    icon: str = None


class PlansUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name_ar: Optional[str] = None
    name_en: Optional[str] = None
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None
    price_lifetime: Optional[float] = None
    billing_type: Optional[str] = None
    features: Optional[str] = None
    limits: Optional[str] = None
    trial_days: Optional[int] = None
    status: Optional[str] = None
    is_recommended: Optional[bool] = None
    sort_order: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class PlansResponse(BaseModel):
    """Entity response schema"""
    id: int
    name_ar: str
    name_en: str
    description_ar: Optional[str] = None
    description_en: Optional[str] = None
    price_monthly: float
    price_yearly: Optional[float] = None
    price_lifetime: Optional[float] = None
    billing_type: Optional[str] = None
    features: Optional[str] = None
    limits: Optional[str] = None
    trial_days: Optional[int] = None
    status: str
    is_recommended: Optional[bool] = None
    sort_order: int
    color: Optional[str] = None
    icon: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PlansListResponse(BaseModel):
    """List response schema"""
    items: List[PlansResponse]
    total: int
    skip: int
    limit: int


class PlansBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[PlansData]


class PlansBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: PlansUpdateData


class PlansBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[PlansBatchUpdateItem]


class PlansBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=PlansListResponse)
async def query_planss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query planss with filtering, sorting, and pagination"""
    logger.debug(f"Querying planss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = PlansService(db)
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
        )
        logger.debug(f"Found {result['total']} planss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying planss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=PlansListResponse)
async def query_planss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query planss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying planss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = PlansService(db)
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
        logger.debug(f"Found {result['total']} planss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying planss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=PlansResponse)
async def get_plans(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single plans by ID"""
    logger.debug(f"Fetching plans with id: {id}, fields={fields}")
    
    service = PlansService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Plans with id {id} not found")
            raise HTTPException(status_code=404, detail="Plans not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching plans {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=PlansResponse, status_code=201)
async def create_plans(
    data: PlansData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new plans"""
    logger.debug(f"Creating new plans with data: {data}")
    
    service = PlansService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create plans")
        
        logger.info(f"Plans created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating plans: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating plans: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[PlansResponse], status_code=201)
async def create_planss_batch(
    request: PlansBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple planss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} planss")
    
    service = PlansService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} planss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[PlansResponse])
async def update_planss_batch(
    request: PlansBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple planss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} planss")
    
    service = PlansService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} planss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=PlansResponse)
async def update_plans(
    id: int,
    data: PlansUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing plans"""
    logger.debug(f"Updating plans {id} with data: {data}")

    service = PlansService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Plans with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Plans not found")
        
        logger.info(f"Plans {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating plans {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating plans {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_planss_batch(
    request: PlansBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple planss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} planss")
    
    service = PlansService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} planss successfully")
        return {"message": f"Successfully deleted {deleted_count} planss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_plans(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single plans by ID"""
    logger.debug(f"Deleting plans with id: {id}")
    
    service = PlansService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Plans with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Plans not found")
        
        logger.info(f"Plans {id} deleted successfully")
        return {"message": "Plans deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting plans {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")