"""
Moyasar Payment Router
Handles payment creation, verification, and callback for Moyasar gateway.
Supports: Mada, Visa/Mastercard, Apple Pay
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from services.moyasar_payment import MoyasarService, MoyasarError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/moyasar", tags=["moyasar-payment"])


# ---------- Request/Response Models ----------

class CreatePaymentRequest(BaseModel):
    """Request to initiate a Moyasar payment"""
    plan_id: int = Field(..., description="Plan ID to subscribe to")
    billing_cycle: str = Field("monthly", description="Billing cycle: monthly, yearly, lifetime")
    amount: float = Field(..., description="Amount in SAR")
    source_type: str = Field("creditcard", description="Payment method: creditcard, mada, applepay, stcpay")
    success_url: Optional[str] = Field(None, description="Frontend success URL")
    cancel_url: Optional[str] = Field(None, description="Frontend cancel URL")


class CreatePaymentResponse(BaseModel):
    """Response with payment details for frontend"""
    payment_id: str
    status: str
    amount: int  # in halalas
    currency: str
    transaction_url: Optional[str] = None  # Redirect URL for 3D Secure / hosted form


class VerifyPaymentRequest(BaseModel):
    """Request to verify a payment"""
    payment_id: str = Field(..., description="Moyasar payment ID")


class VerifyPaymentResponse(BaseModel):
    """Payment verification response"""
    payment_id: str
    status: str
    amount: int
    currency: str
    source_type: Optional[str] = None
    source_company: Optional[str] = None
    is_paid: bool


class PublishableKeyResponse(BaseModel):
    """Response with Moyasar publishable key for frontend payment form"""
    publishable_key: str


# ---------- Routes ----------

@router.get("/config", response_model=PublishableKeyResponse)
async def get_moyasar_config(db: AsyncSession = Depends(get_db)):
    """Get Moyasar publishable key for frontend payment form initialization"""
    try:
        service = MoyasarService(db=db)
        key = await service.get_publishable_key()
        if not key:
            logger.warning("Moyasar publishable key not configured in payment_gateway_settings")
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=503,
                content={
                    "detail": "بوابة الدفع غير مُهيأة بعد. يرجى التواصل مع المسؤول لإعداد مفاتيح Moyasar.",
                    "error_code": "PUBLISHABLE_KEY_MISSING",
                },
            )
        return PublishableKeyResponse(publishable_key=key)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading Moyasar config: {e}", exc_info=True)
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={
                "detail": "حدث خطأ أثناء تحميل إعدادات الدفع. يرجى المحاولة لاحقاً.",
                "error_code": "GATEWAY_ERROR",
            },
        )


@router.get("/debug-config")
async def debug_moyasar_config(db: AsyncSession = Depends(get_db)):
    """Debug endpoint to check what's stored in the database for Moyasar gateway.
    Helps diagnose why the frontend may report 'payment gateway not configured'.
    """
    from services.payment_gateway_settings import Payment_gateway_settingsService
    from sqlalchemy import select, func
    from models.payment_gateway_settings import Payment_gateway_settings

    service = Payment_gateway_settingsService(db)

    # Try exact match
    exact = await service.get_by_field("gateway_name", "moyasar")

    # Try case-insensitive match
    ci_result = await db.execute(
        select(Payment_gateway_settings).where(
            func.lower(Payment_gateway_settings.gateway_name) == "moyasar"
        )
    )
    ci_match = ci_result.scalar_one_or_none()

    # Try getting all gateways
    all_gateways_result = await service.get_list(limit=50)

    gateway_info = []
    for g in all_gateways_result.get("items", []):
        gateway_info.append({
            "id": g.id,
            "gateway_name": g.gateway_name,
            "display_name": g.display_name,
            "has_api_key": bool(g.api_key_encrypted),
            "has_secret_key": bool(g.secret_key_encrypted),
            "has_public_key": bool(g.public_key_encrypted),
            "public_key_preview": g.public_key_encrypted[:12] + "..." if g.public_key_encrypted else None,
            "is_active": g.is_active,
            "environment": g.environment,
        })

    return {
        "exact_match_found": exact is not None,
        "exact_match_gateway_name": exact.gateway_name if exact else None,
        "exact_match_has_public_key": bool(exact.public_key_encrypted) if exact else None,
        "case_insensitive_match_found": ci_match is not None,
        "case_insensitive_gateway_name": ci_match.gateway_name if ci_match else None,
        "total_gateways": len(gateway_info),
        "all_gateways": gateway_info,
    }


@router.post("/create_payment", response_model=CreatePaymentResponse)
async def create_payment(
    data: CreatePaymentRequest,
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Moyasar payment session.
    The frontend will use the returned payment_id with Moyasar.js form,
    or redirect to transaction_url for 3D Secure verification.
    """
    try:
        # Get frontend host for callback
        frontend_host = request.headers.get("App-Host", "")
        if frontend_host and not frontend_host.startswith(("http://", "https://")):
            frontend_host = f"https://{frontend_host}"

        callback_url = data.success_url or f"{frontend_host}/checkout/callback"

        # Convert SAR to halalas (1 SAR = 100 halalas)
        amount_halalas = int(data.amount * 100)

        # Determine description
        description = f"Salmo Assist - Plan {data.plan_id} ({data.billing_cycle})"

        service = MoyasarService(db=db)

        from services.moyasar_payment import MoyasarPaymentRequest
        payment_request = MoyasarPaymentRequest(
            amount=amount_halalas,
            currency="SAR",
            description=description,
            callback_url=callback_url,
            source_type=data.source_type,
            metadata={
                "user_id": current_user.id,
                "plan_id": str(data.plan_id),
                "billing_cycle": data.billing_cycle,
            },
        )

        result = await service.create_payment(payment_request)

        logger.info(f"Payment created: {result.id} for user {current_user.id}, plan {data.plan_id}")

        return CreatePaymentResponse(
            payment_id=result.id,
            status=result.status,
            amount=result.amount,
            currency=result.currency,
            transaction_url=result.url,
        )

    except MoyasarError as e:
        logger.error(f"Moyasar payment error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected payment error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Payment creation failed: {str(e)}")


@router.post("/verify_payment", response_model=VerifyPaymentResponse)
async def verify_payment(
    data: VerifyPaymentRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a Moyasar payment status.
    Called by frontend after payment callback to confirm payment was successful.
    """
    try:
        service = MoyasarService(db=db)
        result = await service.get_payment(data.payment_id)

        is_paid = result.status == "paid"

        logger.info(f"Payment verification: {data.payment_id} - status: {result.status}, paid: {is_paid}")

        return VerifyPaymentResponse(
            payment_id=result.id,
            status=result.status,
            amount=result.amount,
            currency=result.currency,
            source_type=result.source_type,
            source_company=result.source_company,
            is_paid=is_paid,
        )

    except MoyasarError as e:
        logger.error(f"Moyasar verification error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected verification error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")


@router.post("/webhook")
async def moyasar_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Moyasar webhook endpoint for payment status updates.
    Moyasar sends POST requests when payment status changes.
    """
    try:
        body = await request.json()
        event_type = body.get("type", "")
        payment_data = body.get("data", {})
        payment_id = payment_data.get("id", "")
        status = payment_data.get("status", "")

        logger.info(f"Moyasar webhook: type={event_type}, payment_id={payment_id}, status={status}")

        # Handle payment completion
        if status == "paid":
            metadata = payment_data.get("metadata", {})
            user_id = metadata.get("user_id")
            plan_id = metadata.get("plan_id")
            billing_cycle = metadata.get("billing_cycle", "monthly")

            if user_id and plan_id:
                logger.info(f"Payment confirmed via webhook: user={user_id}, plan={plan_id}")
                # The subscription activation is handled by the frontend after verify_payment
                # This webhook serves as a backup confirmation

        return {"status": "received"}

    except Exception as e:
        logger.error(f"Webhook processing error: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}