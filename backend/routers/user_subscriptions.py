import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.user_subscriptions import User_subscriptionsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/user_subscriptions", tags=["user_subscriptions"])


# ---------- Pydantic Schemas ----------
class User_subscriptionsData(BaseModel):
    """Entity data schema (for create/update)"""
    plan_id: int
    status: str
    billing_cycle: str = None
    start_date: str = None
    end_date: str = None
    auto_renew: bool = None
    payment_method: str = None
    amount_paid: float = None


class User_subscriptionsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    plan_id: Optional[int] = None
    status: Optional[str] = None
    billing_cycle: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    auto_renew: Optional[bool] = None
    payment_method: Optional[str] = None
    amount_paid: Optional[float] = None


class User_subscriptionsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    plan_id: int
    status: str
    billing_cycle: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    auto_renew: Optional[bool] = None
    payment_method: Optional[str] = None
    amount_paid: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class User_subscriptionsListResponse(BaseModel):
    """List response schema"""
    items: List[User_subscriptionsResponse]
    total: int
    skip: int
    limit: int


class User_subscriptionsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[User_subscriptionsData]


class User_subscriptionsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: User_subscriptionsUpdateData


class User_subscriptionsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[User_subscriptionsBatchUpdateItem]


class User_subscriptionsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=User_subscriptionsListResponse)
async def query_user_subscriptionss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query user_subscriptionss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying user_subscriptionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = User_subscriptionsService(db)
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
        logger.debug(f"Found {result['total']} user_subscriptionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying user_subscriptionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=User_subscriptionsListResponse)
async def query_user_subscriptionss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query user_subscriptionss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying user_subscriptionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = User_subscriptionsService(db)
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
        logger.debug(f"Found {result['total']} user_subscriptionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying user_subscriptionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=User_subscriptionsResponse)
async def get_user_subscriptions(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single user_subscriptions by ID (user can only see their own records)"""
    logger.debug(f"Fetching user_subscriptions with id: {id}, fields={fields}")
    
    service = User_subscriptionsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"User_subscriptions with id {id} not found")
            raise HTTPException(status_code=404, detail="User_subscriptions not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user_subscriptions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=User_subscriptionsResponse, status_code=201)
async def create_user_subscriptions(
    data: User_subscriptionsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user_subscriptions"""
    logger.debug(f"Creating new user_subscriptions with data: {data}")
    
    service = User_subscriptionsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create user_subscriptions")
        
        logger.info(f"User_subscriptions created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating user_subscriptions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating user_subscriptions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[User_subscriptionsResponse], status_code=201)
async def create_user_subscriptionss_batch(
    request: User_subscriptionsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple user_subscriptionss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} user_subscriptionss")
    
    service = User_subscriptionsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} user_subscriptionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[User_subscriptionsResponse])
async def update_user_subscriptionss_batch(
    request: User_subscriptionsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple user_subscriptionss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} user_subscriptionss")
    
    service = User_subscriptionsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} user_subscriptionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=User_subscriptionsResponse)
async def update_user_subscriptions(
    id: int,
    data: User_subscriptionsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing user_subscriptions (requires ownership)"""
    logger.debug(f"Updating user_subscriptions {id} with data: {data}")

    service = User_subscriptionsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"User_subscriptions with id {id} not found for update")
            raise HTTPException(status_code=404, detail="User_subscriptions not found")
        
        logger.info(f"User_subscriptions {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating user_subscriptions {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating user_subscriptions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_user_subscriptionss_batch(
    request: User_subscriptionsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple user_subscriptionss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} user_subscriptionss")
    
    service = User_subscriptionsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} user_subscriptionss successfully")
        return {"message": f"Successfully deleted {deleted_count} user_subscriptionss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_user_subscriptions(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single user_subscriptions by ID (requires ownership)"""
    logger.debug(f"Deleting user_subscriptions with id: {id}")
    
    service = User_subscriptionsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"User_subscriptions with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="User_subscriptions not found")
        
        logger.info(f"User_subscriptions {id} deleted successfully")
        return {"message": "User_subscriptions deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user_subscriptions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")