import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.packages import PackagesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/packages", tags=["packages"])


# ---------- Pydantic Schemas ----------
class PackagesData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    price: float
    billing_cycle: str
    max_users: int
    features: str = None
    status: str = None


class PackagesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    price: Optional[float] = None
    billing_cycle: Optional[str] = None
    max_users: Optional[int] = None
    features: Optional[str] = None
    status: Optional[str] = None


class PackagesResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: str
    price: float
    billing_cycle: str
    max_users: int
    features: Optional[str] = None
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PackagesListResponse(BaseModel):
    """List response schema"""
    items: List[PackagesResponse]
    total: int
    skip: int
    limit: int


class PackagesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[PackagesData]


class PackagesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: PackagesUpdateData


class PackagesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[PackagesBatchUpdateItem]


class PackagesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=PackagesListResponse)
async def query_packagess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query packagess with filtering, sorting, and pagination"""
    logger.debug(f"Querying packagess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = PackagesService(db)
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
        logger.debug(f"Found {result['total']} packagess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying packagess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=PackagesListResponse)
async def query_packagess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query packagess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying packagess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = PackagesService(db)
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
        logger.debug(f"Found {result['total']} packagess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying packagess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=PackagesResponse)
async def get_packages(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single packages by ID"""
    logger.debug(f"Fetching packages with id: {id}, fields={fields}")
    
    service = PackagesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Packages with id {id} not found")
            raise HTTPException(status_code=404, detail="Packages not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching packages {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=PackagesResponse, status_code=201)
async def create_packages(
    data: PackagesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new packages"""
    logger.debug(f"Creating new packages with data: {data}")
    
    service = PackagesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create packages")
        
        logger.info(f"Packages created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating packages: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating packages: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[PackagesResponse], status_code=201)
async def create_packagess_batch(
    request: PackagesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple packagess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} packagess")
    
    service = PackagesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} packagess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[PackagesResponse])
async def update_packagess_batch(
    request: PackagesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple packagess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} packagess")
    
    service = PackagesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} packagess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=PackagesResponse)
async def update_packages(
    id: int,
    data: PackagesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing packages"""
    logger.debug(f"Updating packages {id} with data: {data}")

    service = PackagesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Packages with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Packages not found")
        
        logger.info(f"Packages {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating packages {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating packages {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_packagess_batch(
    request: PackagesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple packagess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} packagess")
    
    service = PackagesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} packagess successfully")
        return {"message": f"Successfully deleted {deleted_count} packagess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_packages(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single packages by ID"""
    logger.debug(f"Deleting packages with id: {id}")
    
    service = PackagesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Packages with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Packages not found")
        
        logger.info(f"Packages {id} deleted successfully")
        return {"message": "Packages deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting packages {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")