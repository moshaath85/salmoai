import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.gateway_audit_logs import Gateway_audit_logsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/gateway_audit_logs", tags=["gateway_audit_logs"])


# ---------- Pydantic Schemas ----------
class Gateway_audit_logsData(BaseModel):
    """Entity data schema (for create/update)"""
    gateway_name: str
    action: str
    details: str = None
    ip_address: str = None
    connection_status_before: str = None
    connection_status_after: str = None


class Gateway_audit_logsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    gateway_name: Optional[str] = None
    action: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    connection_status_before: Optional[str] = None
    connection_status_after: Optional[str] = None


class Gateway_audit_logsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    gateway_name: str
    action: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    connection_status_before: Optional[str] = None
    connection_status_after: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Gateway_audit_logsListResponse(BaseModel):
    """List response schema"""
    items: List[Gateway_audit_logsResponse]
    total: int
    skip: int
    limit: int


class Gateway_audit_logsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Gateway_audit_logsData]


class Gateway_audit_logsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Gateway_audit_logsUpdateData


class Gateway_audit_logsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Gateway_audit_logsBatchUpdateItem]


class Gateway_audit_logsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Gateway_audit_logsListResponse)
async def query_gateway_audit_logss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query gateway_audit_logss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying gateway_audit_logss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Gateway_audit_logsService(db)
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
        logger.debug(f"Found {result['total']} gateway_audit_logss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying gateway_audit_logss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Gateway_audit_logsListResponse)
async def query_gateway_audit_logss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query gateway_audit_logss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying gateway_audit_logss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Gateway_audit_logsService(db)
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
        logger.debug(f"Found {result['total']} gateway_audit_logss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying gateway_audit_logss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Gateway_audit_logsResponse)
async def get_gateway_audit_logs(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single gateway_audit_logs by ID (user can only see their own records)"""
    logger.debug(f"Fetching gateway_audit_logs with id: {id}, fields={fields}")
    
    service = Gateway_audit_logsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Gateway_audit_logs with id {id} not found")
            raise HTTPException(status_code=404, detail="Gateway_audit_logs not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching gateway_audit_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Gateway_audit_logsResponse, status_code=201)
async def create_gateway_audit_logs(
    data: Gateway_audit_logsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new gateway_audit_logs"""
    logger.debug(f"Creating new gateway_audit_logs with data: {data}")
    
    service = Gateway_audit_logsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create gateway_audit_logs")
        
        logger.info(f"Gateway_audit_logs created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating gateway_audit_logs: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating gateway_audit_logs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Gateway_audit_logsResponse], status_code=201)
async def create_gateway_audit_logss_batch(
    request: Gateway_audit_logsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple gateway_audit_logss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} gateway_audit_logss")
    
    service = Gateway_audit_logsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} gateway_audit_logss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Gateway_audit_logsResponse])
async def update_gateway_audit_logss_batch(
    request: Gateway_audit_logsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple gateway_audit_logss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} gateway_audit_logss")
    
    service = Gateway_audit_logsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} gateway_audit_logss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Gateway_audit_logsResponse)
async def update_gateway_audit_logs(
    id: int,
    data: Gateway_audit_logsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing gateway_audit_logs (requires ownership)"""
    logger.debug(f"Updating gateway_audit_logs {id} with data: {data}")

    service = Gateway_audit_logsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Gateway_audit_logs with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Gateway_audit_logs not found")
        
        logger.info(f"Gateway_audit_logs {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating gateway_audit_logs {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating gateway_audit_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_gateway_audit_logss_batch(
    request: Gateway_audit_logsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple gateway_audit_logss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} gateway_audit_logss")
    
    service = Gateway_audit_logsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} gateway_audit_logss successfully")
        return {"message": f"Successfully deleted {deleted_count} gateway_audit_logss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_gateway_audit_logs(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single gateway_audit_logs by ID (requires ownership)"""
    logger.debug(f"Deleting gateway_audit_logs with id: {id}")
    
    service = Gateway_audit_logsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Gateway_audit_logs with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Gateway_audit_logs not found")
        
        logger.info(f"Gateway_audit_logs {id} deleted successfully")
        return {"message": "Gateway_audit_logs deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting gateway_audit_logs {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")