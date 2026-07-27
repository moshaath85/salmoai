import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.payment_gateway_settings import Payment_gateway_settingsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/payment_gateway_settings", tags=["payment_gateway_settings"])


# ---------- Pydantic Schemas ----------
class Payment_gateway_settingsData(BaseModel):
    """Entity data schema (for create/update)"""
    gateway_name: str
    display_name: str
    api_key_encrypted: str = None
    secret_key_encrypted: str = None
    public_key_encrypted: str = None
    webhook_secret_encrypted: str = None
    merchant_id: str = None
    environment: str = None
    is_active: bool = None
    is_default: bool = None
    supported_currencies: str = None
    supported_countries: str = None
    payment_methods: str = None
    sort_order: int = None
    last_test_at: str = None
    last_test_status: str = None
    last_successful_payment_at: str = None
    connection_status: str = None
    settings_json: str = None


class Payment_gateway_settingsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    gateway_name: Optional[str] = None
    display_name: Optional[str] = None
    api_key_encrypted: Optional[str] = None
    secret_key_encrypted: Optional[str] = None
    public_key_encrypted: Optional[str] = None
    webhook_secret_encrypted: Optional[str] = None
    merchant_id: Optional[str] = None
    environment: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    supported_currencies: Optional[str] = None
    supported_countries: Optional[str] = None
    payment_methods: Optional[str] = None
    sort_order: Optional[int] = None
    last_test_at: Optional[str] = None
    last_test_status: Optional[str] = None
    last_successful_payment_at: Optional[str] = None
    connection_status: Optional[str] = None
    settings_json: Optional[str] = None


class Payment_gateway_settingsResponse(BaseModel):
    """Entity response schema"""
    id: int
    gateway_name: str
    display_name: str
    api_key_encrypted: Optional[str] = None
    secret_key_encrypted: Optional[str] = None
    public_key_encrypted: Optional[str] = None
    webhook_secret_encrypted: Optional[str] = None
    merchant_id: Optional[str] = None
    environment: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    supported_currencies: Optional[str] = None
    supported_countries: Optional[str] = None
    payment_methods: Optional[str] = None
    sort_order: Optional[int] = None
    last_test_at: Optional[str] = None
    last_test_status: Optional[str] = None
    last_successful_payment_at: Optional[str] = None
    connection_status: Optional[str] = None
    settings_json: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Payment_gateway_settingsListResponse(BaseModel):
    """List response schema"""
    items: List[Payment_gateway_settingsResponse]
    total: int
    skip: int
    limit: int


class Payment_gateway_settingsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Payment_gateway_settingsData]


class Payment_gateway_settingsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Payment_gateway_settingsUpdateData


class Payment_gateway_settingsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Payment_gateway_settingsBatchUpdateItem]


class Payment_gateway_settingsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Payment_gateway_settingsListResponse)
async def query_payment_gateway_settingss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query payment_gateway_settingss with filtering, sorting, and pagination"""
    logger.debug(f"Querying payment_gateway_settingss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Payment_gateway_settingsService(db)
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
        logger.debug(f"Found {result['total']} payment_gateway_settingss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying payment_gateway_settingss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Payment_gateway_settingsListResponse)
async def query_payment_gateway_settingss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query payment_gateway_settingss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying payment_gateway_settingss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Payment_gateway_settingsService(db)
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
        logger.debug(f"Found {result['total']} payment_gateway_settingss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying payment_gateway_settingss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Payment_gateway_settingsResponse)
async def get_payment_gateway_settings(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single payment_gateway_settings by ID"""
    logger.debug(f"Fetching payment_gateway_settings with id: {id}, fields={fields}")
    
    service = Payment_gateway_settingsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Payment_gateway_settings with id {id} not found")
            raise HTTPException(status_code=404, detail="Payment_gateway_settings not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching payment_gateway_settings {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Payment_gateway_settingsResponse, status_code=201)
async def create_payment_gateway_settings(
    data: Payment_gateway_settingsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new payment_gateway_settings"""
    logger.debug(f"Creating new payment_gateway_settings with data: {data}")
    
    service = Payment_gateway_settingsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create payment_gateway_settings")
        
        logger.info(f"Payment_gateway_settings created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating payment_gateway_settings: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating payment_gateway_settings: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Payment_gateway_settingsResponse], status_code=201)
async def create_payment_gateway_settingss_batch(
    request: Payment_gateway_settingsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple payment_gateway_settingss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} payment_gateway_settingss")
    
    service = Payment_gateway_settingsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} payment_gateway_settingss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Payment_gateway_settingsResponse])
async def update_payment_gateway_settingss_batch(
    request: Payment_gateway_settingsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple payment_gateway_settingss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} payment_gateway_settingss")
    
    service = Payment_gateway_settingsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} payment_gateway_settingss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Payment_gateway_settingsResponse)
async def update_payment_gateway_settings(
    id: int,
    data: Payment_gateway_settingsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing payment_gateway_settings"""
    logger.debug(f"Updating payment_gateway_settings {id} with data: {data}")

    service = Payment_gateway_settingsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Payment_gateway_settings with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Payment_gateway_settings not found")
        
        logger.info(f"Payment_gateway_settings {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating payment_gateway_settings {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating payment_gateway_settings {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_payment_gateway_settingss_batch(
    request: Payment_gateway_settingsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple payment_gateway_settingss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} payment_gateway_settingss")
    
    service = Payment_gateway_settingsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} payment_gateway_settingss successfully")
        return {"message": f"Successfully deleted {deleted_count} payment_gateway_settingss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_payment_gateway_settings(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single payment_gateway_settings by ID"""
    logger.debug(f"Deleting payment_gateway_settings with id: {id}")
    
    service = Payment_gateway_settingsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Payment_gateway_settings with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Payment_gateway_settings not found")
        
        logger.info(f"Payment_gateway_settings {id} deleted successfully")
        return {"message": "Payment_gateway_settings deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting payment_gateway_settings {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")