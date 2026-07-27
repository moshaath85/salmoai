import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.client_subscriptions import Client_subscriptionsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/client_subscriptions", tags=["client_subscriptions"])


# ---------- Pydantic Schemas ----------
class Client_subscriptionsData(BaseModel):
    """Entity data schema (for create/update)"""
    client_id: int
    package_id: int
    status: str = None
    payment_status: str = None
    start_date: str = None
    end_date: str = None


class Client_subscriptionsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    client_id: Optional[int] = None
    package_id: Optional[int] = None
    status: Optional[str] = None
    payment_status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class Client_subscriptionsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    client_id: int
    package_id: int
    status: Optional[str] = None
    payment_status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Client_subscriptionsListResponse(BaseModel):
    """List response schema"""
    items: List[Client_subscriptionsResponse]
    total: int
    skip: int
    limit: int


class Client_subscriptionsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Client_subscriptionsData]


class Client_subscriptionsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Client_subscriptionsUpdateData


class Client_subscriptionsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Client_subscriptionsBatchUpdateItem]


class Client_subscriptionsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Client_subscriptionsListResponse)
async def query_client_subscriptionss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query client_subscriptionss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying client_subscriptionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Client_subscriptionsService(db)
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
        logger.debug(f"Found {result['total']} client_subscriptionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying client_subscriptionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Client_subscriptionsListResponse)
async def query_client_subscriptionss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query client_subscriptionss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying client_subscriptionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Client_subscriptionsService(db)
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
        logger.debug(f"Found {result['total']} client_subscriptionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying client_subscriptionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Client_subscriptionsResponse)
async def get_client_subscriptions(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single client_subscriptions by ID (user can only see their own records)"""
    logger.debug(f"Fetching client_subscriptions with id: {id}, fields={fields}")
    
    service = Client_subscriptionsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Client_subscriptions with id {id} not found")
            raise HTTPException(status_code=404, detail="Client_subscriptions not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching client_subscriptions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Client_subscriptionsResponse, status_code=201)
async def create_client_subscriptions(
    data: Client_subscriptionsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new client_subscriptions"""
    logger.debug(f"Creating new client_subscriptions with data: {data}")
    
    service = Client_subscriptionsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create client_subscriptions")
        
        logger.info(f"Client_subscriptions created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating client_subscriptions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating client_subscriptions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Client_subscriptionsResponse], status_code=201)
async def create_client_subscriptionss_batch(
    request: Client_subscriptionsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple client_subscriptionss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} client_subscriptionss")
    
    service = Client_subscriptionsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} client_subscriptionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Client_subscriptionsResponse])
async def update_client_subscriptionss_batch(
    request: Client_subscriptionsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple client_subscriptionss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} client_subscriptionss")
    
    service = Client_subscriptionsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} client_subscriptionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Client_subscriptionsResponse)
async def update_client_subscriptions(
    id: int,
    data: Client_subscriptionsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing client_subscriptions (requires ownership)"""
    logger.debug(f"Updating client_subscriptions {id} with data: {data}")

    service = Client_subscriptionsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Client_subscriptions with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Client_subscriptions not found")
        
        logger.info(f"Client_subscriptions {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating client_subscriptions {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating client_subscriptions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_client_subscriptionss_batch(
    request: Client_subscriptionsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple client_subscriptionss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} client_subscriptionss")
    
    service = Client_subscriptionsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} client_subscriptionss successfully")
        return {"message": f"Successfully deleted {deleted_count} client_subscriptionss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_client_subscriptions(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single client_subscriptions by ID (requires ownership)"""
    logger.debug(f"Deleting client_subscriptions with id: {id}")
    
    service = Client_subscriptionsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Client_subscriptions with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Client_subscriptions not found")
        
        logger.info(f"Client_subscriptions {id} deleted successfully")
        return {"message": "Client_subscriptions deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting client_subscriptions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")