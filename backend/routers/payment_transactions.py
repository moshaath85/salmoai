import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.payment_transactions import Payment_transactionsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/payment_transactions", tags=["payment_transactions"])


# ---------- Pydantic Schemas ----------
class Payment_transactionsData(BaseModel):
    """Entity data schema (for create/update)"""
    plan_id: int = None
    plan_name: str = None
    amount: float
    currency: str = None
    status: str
    payment_method: str = None
    payment_gateway: str = None
    gateway_payment_id: str = None
    billing_cycle: str = None
    invoice_number: str = None
    description: str = None
    failure_reason: str = None
    refund_amount: float = None
    is_renewal: bool = None


class Payment_transactionsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    plan_id: Optional[int] = None
    plan_name: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    status: Optional[str] = None
    payment_method: Optional[str] = None
    payment_gateway: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    billing_cycle: Optional[str] = None
    invoice_number: Optional[str] = None
    description: Optional[str] = None
    failure_reason: Optional[str] = None
    refund_amount: Optional[float] = None
    is_renewal: Optional[bool] = None


class Payment_transactionsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    plan_id: Optional[int] = None
    plan_name: Optional[str] = None
    amount: float
    currency: Optional[str] = None
    status: str
    payment_method: Optional[str] = None
    payment_gateway: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    billing_cycle: Optional[str] = None
    invoice_number: Optional[str] = None
    description: Optional[str] = None
    failure_reason: Optional[str] = None
    refund_amount: Optional[float] = None
    is_renewal: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Payment_transactionsListResponse(BaseModel):
    """List response schema"""
    items: List[Payment_transactionsResponse]
    total: int
    skip: int
    limit: int


class Payment_transactionsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[Payment_transactionsData]


class Payment_transactionsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: Payment_transactionsUpdateData


class Payment_transactionsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[Payment_transactionsBatchUpdateItem]


class Payment_transactionsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=Payment_transactionsListResponse)
async def query_payment_transactionss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query payment_transactionss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying payment_transactionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = Payment_transactionsService(db)
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
        logger.debug(f"Found {result['total']} payment_transactionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying payment_transactionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=Payment_transactionsListResponse)
async def query_payment_transactionss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query payment_transactionss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying payment_transactionss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = Payment_transactionsService(db)
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
        logger.debug(f"Found {result['total']} payment_transactionss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying payment_transactionss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=Payment_transactionsResponse)
async def get_payment_transactions(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single payment_transactions by ID (user can only see their own records)"""
    logger.debug(f"Fetching payment_transactions with id: {id}, fields={fields}")
    
    service = Payment_transactionsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Payment_transactions with id {id} not found")
            raise HTTPException(status_code=404, detail="Payment_transactions not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching payment_transactions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=Payment_transactionsResponse, status_code=201)
async def create_payment_transactions(
    data: Payment_transactionsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new payment_transactions"""
    logger.debug(f"Creating new payment_transactions with data: {data}")
    
    service = Payment_transactionsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create payment_transactions")
        
        logger.info(f"Payment_transactions created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating payment_transactions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating payment_transactions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[Payment_transactionsResponse], status_code=201)
async def create_payment_transactionss_batch(
    request: Payment_transactionsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple payment_transactionss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} payment_transactionss")
    
    service = Payment_transactionsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} payment_transactionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[Payment_transactionsResponse])
async def update_payment_transactionss_batch(
    request: Payment_transactionsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple payment_transactionss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} payment_transactionss")
    
    service = Payment_transactionsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} payment_transactionss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=Payment_transactionsResponse)
async def update_payment_transactions(
    id: int,
    data: Payment_transactionsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing payment_transactions (requires ownership)"""
    logger.debug(f"Updating payment_transactions {id} with data: {data}")

    service = Payment_transactionsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Payment_transactions with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Payment_transactions not found")
        
        logger.info(f"Payment_transactions {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating payment_transactions {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating payment_transactions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_payment_transactionss_batch(
    request: Payment_transactionsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple payment_transactionss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} payment_transactionss")
    
    service = Payment_transactionsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} payment_transactionss successfully")
        return {"message": f"Successfully deleted {deleted_count} payment_transactionss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_payment_transactions(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single payment_transactions by ID (requires ownership)"""
    logger.debug(f"Deleting payment_transactions with id: {id}")
    
    service = Payment_transactionsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Payment_transactions with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Payment_transactions not found")
        
        logger.info(f"Payment_transactions {id} deleted successfully")
        return {"message": "Payment_transactions deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting payment_transactions {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")