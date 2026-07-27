import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.webhook_events import Webhook_eventsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/webhook_events", tags=["webhook_events"])


# ---------- Pydantic Schemas ----------
class Webhook_eventsData(BaseModel):
    """Entity data schema (for create/update)"""
    gateway_name: str
    event_type: str
    payload: str = None
    status: str = None
    retry_count: int = None
    max_retries: int = None
    error_message: str = None
    signature_valid: bool = None
    processed_at: str = None


class Webhook_eventsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    gateway_name: Optional[str] = None
    event_type: Optional[str] = None
    payload: Optional[str] = None
    status: Optional[str] = None
    retry_count: Optional[int] = None
    max_retries: Optional[int] = None
    error_message: Optional[str] = None
    signature_valid: Optional[bool] = None
    processed_at: Optional[str] = None


class Webhook_eventsResponse(BaseModel):
    """Entity response schema"""
    id: int
    gateway_name: str
    event_type: str
    payload: Optional[str] = None
    status: Optional[str] = None
    retry_count: Optional[int] = None
    max_retries: Optional[int] = None
    error_message: Optional[str] = None
    signature_valid: Optional[bool] = None
    processed_at: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Webhook_eventsListResponse(BaseModel):
    """List response schema"""
    items: List[Webhook_eventsResponse]
    total: int
    skip: int
    limit: int


class Webhook_eventsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Webhook_eventsData]


class Webhook_eventsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Webhook_eventsUpdateData


class Webhook_eventsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Webhook_eventsBatchUpdateItem]


class Webhook_eventsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Webhook_eventsListResponse)
async def query_webhook_eventss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query webhook_eventss with filtering, sorting, and pagination"""
    logger.debug(f"Querying webhook_eventss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Webhook_eventsService(db)
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
        logger.debug(f"Found {result['total']} webhook_eventss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying webhook_eventss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Webhook_eventsListResponse)
async def query_webhook_eventss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query webhook_eventss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying webhook_eventss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Webhook_eventsService(db)
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
        logger.debug(f"Found {result['total']} webhook_eventss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying webhook_eventss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Webhook_eventsResponse)
async def get_webhook_events(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single webhook_events by ID"""
    logger.debug(f"Fetching webhook_events with id: {id}, fields={fields}")
    
    service = Webhook_eventsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Webhook_events with id {id} not found")
            raise HTTPException(status_code=404, detail="Webhook_events not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching webhook_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Webhook_eventsResponse, status_code=201)
async def create_webhook_events(
    data: Webhook_eventsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new webhook_events"""
    logger.debug(f"Creating new webhook_events with data: {data}")
    
    service = Webhook_eventsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create webhook_events")
        
        logger.info(f"Webhook_events created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating webhook_events: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating webhook_events: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Webhook_eventsResponse], status_code=201)
async def create_webhook_eventss_batch(
    request: Webhook_eventsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple webhook_eventss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} webhook_eventss")
    
    service = Webhook_eventsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} webhook_eventss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Webhook_eventsResponse])
async def update_webhook_eventss_batch(
    request: Webhook_eventsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple webhook_eventss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} webhook_eventss")
    
    service = Webhook_eventsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} webhook_eventss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Webhook_eventsResponse)
async def update_webhook_events(
    id: int,
    data: Webhook_eventsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing webhook_events"""
    logger.debug(f"Updating webhook_events {id} with data: {data}")

    service = Webhook_eventsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Webhook_events with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Webhook_events not found")
        
        logger.info(f"Webhook_events {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating webhook_events {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating webhook_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_webhook_eventss_batch(
    request: Webhook_eventsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple webhook_eventss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} webhook_eventss")
    
    service = Webhook_eventsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} webhook_eventss successfully")
        return {"message": f"Successfully deleted {deleted_count} webhook_eventss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_webhook_events(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single webhook_events by ID"""
    logger.debug(f"Deleting webhook_events with id: {id}")
    
    service = Webhook_eventsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Webhook_events with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Webhook_events not found")
        
        logger.info(f"Webhook_events {id} deleted successfully")
        return {"message": "Webhook_events deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting webhook_events {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")