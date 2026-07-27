import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.tickets import TicketsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/tickets", tags=["tickets"])


# ---------- Pydantic Schemas ----------
class TicketsData(BaseModel):
    """Entity data schema (for create/update)"""
    ticket_number: str
    subject: str
    customer_name: str = None
    customer_email: str = None
    category: str = None
    status: str = None
    priority: str = None


class TicketsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    ticket_number: Optional[str] = None
    subject: Optional[str] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None


class TicketsResponse(BaseModel):
    """Entity response schema"""
    id: int
    ticket_number: str
    subject: str
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TicketsListResponse(BaseModel):
    """List response schema"""
    items: List[TicketsResponse]
    total: int
    skip: int
    limit: int


class TicketsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[TicketsData]


class TicketsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: TicketsUpdateData


class TicketsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[TicketsBatchUpdateItem]


class TicketsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=TicketsListResponse)
async def query_ticketss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query ticketss with filtering, sorting, and pagination"""
    logger.debug(f"Querying ticketss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = TicketsService(db)
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
        logger.debug(f"Found {result['total']} ticketss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying ticketss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=TicketsListResponse)
async def query_ticketss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query ticketss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying ticketss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = TicketsService(db)
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
        logger.debug(f"Found {result['total']} ticketss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying ticketss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=TicketsResponse)
async def get_tickets(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single tickets by ID"""
    logger.debug(f"Fetching tickets with id: {id}, fields={fields}")
    
    service = TicketsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Tickets with id {id} not found")
            raise HTTPException(status_code=404, detail="Tickets not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching tickets {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=TicketsResponse, status_code=201)
async def create_tickets(
    data: TicketsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new tickets"""
    logger.debug(f"Creating new tickets with data: {data}")
    
    service = TicketsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create tickets")
        
        logger.info(f"Tickets created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating tickets: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating tickets: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[TicketsResponse], status_code=201)
async def create_ticketss_batch(
    request: TicketsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple ticketss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} ticketss")
    
    service = TicketsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} ticketss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[TicketsResponse])
async def update_ticketss_batch(
    request: TicketsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple ticketss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} ticketss")
    
    service = TicketsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} ticketss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=TicketsResponse)
async def update_tickets(
    id: int,
    data: TicketsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing tickets"""
    logger.debug(f"Updating tickets {id} with data: {data}")

    service = TicketsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Tickets with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Tickets not found")
        
        logger.info(f"Tickets {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating tickets {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating tickets {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_ticketss_batch(
    request: TicketsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple ticketss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} ticketss")
    
    service = TicketsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} ticketss successfully")
        return {"message": f"Successfully deleted {deleted_count} ticketss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_tickets(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single tickets by ID"""
    logger.debug(f"Deleting tickets with id: {id}")
    
    service = TicketsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Tickets with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Tickets not found")
        
        logger.info(f"Tickets {id} deleted successfully")
        return {"message": "Tickets deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting tickets {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")