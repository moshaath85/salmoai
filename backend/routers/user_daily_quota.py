import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.user_daily_quota import User_daily_quotaService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/user_daily_quota", tags=["user_daily_quota"])


# ---------- Pydantic Schemas ----------
class User_daily_quotaData(BaseModel):
    """Entity data schema (for create/update)"""
    quota_date: str
    question_count: int
    plan: str


class User_daily_quotaUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    quota_date: Optional[str] = None
    question_count: Optional[int] = None
    plan: Optional[str] = None


class User_daily_quotaResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    quota_date: str
    question_count: int
    plan: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class User_daily_quotaListResponse(BaseModel):
    """List response schema"""
    items: List[User_daily_quotaResponse]
    total: int
    skip: int
    limit: int


class User_daily_quotaBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[User_daily_quotaData]


class User_daily_quotaBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: User_daily_quotaUpdateData


class User_daily_quotaBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[User_daily_quotaBatchUpdateItem]


class User_daily_quotaBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=User_daily_quotaListResponse)
async def query_user_daily_quotas(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query user_daily_quotas with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying user_daily_quotas: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = User_daily_quotaService(db)
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
        logger.debug(f"Found {result['total']} user_daily_quotas")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying user_daily_quotas: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=User_daily_quotaListResponse)
async def query_user_daily_quotas_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query user_daily_quotas with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying user_daily_quotas: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = User_daily_quotaService(db)
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
        logger.debug(f"Found {result['total']} user_daily_quotas")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying user_daily_quotas: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=User_daily_quotaResponse)
async def get_user_daily_quota(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single user_daily_quota by ID (user can only see their own records)"""
    logger.debug(f"Fetching user_daily_quota with id: {id}, fields={fields}")
    
    service = User_daily_quotaService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"User_daily_quota with id {id} not found")
            raise HTTPException(status_code=404, detail="User_daily_quota not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user_daily_quota {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=User_daily_quotaResponse, status_code=201)
async def create_user_daily_quota(
    data: User_daily_quotaData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user_daily_quota"""
    logger.debug(f"Creating new user_daily_quota with data: {data}")
    
    service = User_daily_quotaService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create user_daily_quota")
        
        logger.info(f"User_daily_quota created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating user_daily_quota: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating user_daily_quota: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[User_daily_quotaResponse], status_code=201)
async def create_user_daily_quotas_batch(
    request: User_daily_quotaBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple user_daily_quotas in a single request"""
    logger.debug(f"Batch creating {len(request.items)} user_daily_quotas")
    
    service = User_daily_quotaService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} user_daily_quotas successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[User_daily_quotaResponse])
async def update_user_daily_quotas_batch(
    request: User_daily_quotaBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple user_daily_quotas in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} user_daily_quotas")
    
    service = User_daily_quotaService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} user_daily_quotas successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=User_daily_quotaResponse)
async def update_user_daily_quota(
    id: int,
    data: User_daily_quotaUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing user_daily_quota (requires ownership)"""
    logger.debug(f"Updating user_daily_quota {id} with data: {data}")

    service = User_daily_quotaService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"User_daily_quota with id {id} not found for update")
            raise HTTPException(status_code=404, detail="User_daily_quota not found")
        
        logger.info(f"User_daily_quota {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating user_daily_quota {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating user_daily_quota {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_user_daily_quotas_batch(
    request: User_daily_quotaBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple user_daily_quotas by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} user_daily_quotas")
    
    service = User_daily_quotaService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} user_daily_quotas successfully")
        return {"message": f"Successfully deleted {deleted_count} user_daily_quotas", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_user_daily_quota(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single user_daily_quota by ID (requires ownership)"""
    logger.debug(f"Deleting user_daily_quota with id: {id}")
    
    service = User_daily_quotaService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"User_daily_quota with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="User_daily_quota not found")
        
        logger.info(f"User_daily_quota {id} deleted successfully")
        return {"message": "User_daily_quota deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user_daily_quota {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")