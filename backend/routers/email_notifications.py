"""
Email Notifications Router
Provides endpoints for sending email notifications and testing SMTP connection.
"""
import logging
from enum import Enum
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.email_service import EmailService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/email", tags=["email_notifications"])


# ---------- Enums & Schemas ----------

class NotificationType(str, Enum):
    PAYMENT_SUCCESS = "payment_success"
    PAYMENT_FAILURE = "payment_failure"
    INVOICE_CREATED = "invoice_created"
    SUBSCRIPTION_RENEWAL = "subscription_renewal"
    SUBSCRIPTION_EXPIRY = "subscription_expiry"


class SendNotificationRequest(BaseModel):
    notification_type: NotificationType
    to_email: str
    customer_name: str
    plan_name: Optional[str] = None
    amount: Optional[str] = None
    invoice_number: Optional[str] = None
    date: Optional[str] = None
    next_billing_date: Optional[str] = None
    expiry_date: Optional[str] = None
    reason: Optional[str] = None


class SendNotificationResponse(BaseModel):
    success: bool
    message: str


class TestConnectionResponse(BaseModel):
    success: bool
    message: str


class SendCustomEmailRequest(BaseModel):
    to_email: str
    subject: str
    html_body: str


# ---------- Routes ----------

@router.post("/test", response_model=TestConnectionResponse)
async def test_smtp_connection(
    db: AsyncSession = Depends(get_db),
):
    """Test the SMTP connection using current email settings."""
    logger.info("Testing SMTP connection")
    service = EmailService(db)
    result = await service.test_connection()
    return TestConnectionResponse(**result)


@router.post("/send-notification", response_model=SendNotificationResponse)
async def send_notification(
    data: SendNotificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send an email notification based on the notification type."""
    logger.info(f"Sending {data.notification_type} notification to {data.to_email}")
    service = EmailService(db)

    try:
        if data.notification_type == NotificationType.PAYMENT_SUCCESS:
            if not data.plan_name or not data.amount or not data.invoice_number:
                raise HTTPException(
                    status_code=400,
                    detail="plan_name, amount, and invoice_number are required for payment_success",
                )
            result = await service.send_payment_success_email(
                to_email=data.to_email,
                customer_name=data.customer_name,
                plan_name=data.plan_name,
                amount=data.amount,
                invoice_number=data.invoice_number,
            )

        elif data.notification_type == NotificationType.PAYMENT_FAILURE:
            if not data.plan_name or not data.reason:
                raise HTTPException(
                    status_code=400,
                    detail="plan_name and reason are required for payment_failure",
                )
            result = await service.send_payment_failure_email(
                to_email=data.to_email,
                customer_name=data.customer_name,
                plan_name=data.plan_name,
                reason=data.reason,
            )

        elif data.notification_type == NotificationType.INVOICE_CREATED:
            if not data.invoice_number or not data.plan_name or not data.amount or not data.date:
                raise HTTPException(
                    status_code=400,
                    detail="invoice_number, plan_name, amount, and date are required for invoice_created",
                )
            result = await service.send_invoice_email(
                to_email=data.to_email,
                customer_name=data.customer_name,
                invoice_number=data.invoice_number,
                plan_name=data.plan_name,
                amount=data.amount,
                date=data.date,
            )

        elif data.notification_type == NotificationType.SUBSCRIPTION_RENEWAL:
            if not data.plan_name or not data.next_billing_date:
                raise HTTPException(
                    status_code=400,
                    detail="plan_name and next_billing_date are required for subscription_renewal",
                )
            result = await service.send_subscription_renewal_email(
                to_email=data.to_email,
                customer_name=data.customer_name,
                plan_name=data.plan_name,
                next_billing_date=data.next_billing_date,
            )

        elif data.notification_type == NotificationType.SUBSCRIPTION_EXPIRY:
            if not data.plan_name or not data.expiry_date:
                raise HTTPException(
                    status_code=400,
                    detail="plan_name and expiry_date are required for subscription_expiry",
                )
            result = await service.send_subscription_expiry_email(
                to_email=data.to_email,
                customer_name=data.customer_name,
                plan_name=data.plan_name,
                expiry_date=data.expiry_date,
            )

        else:
            raise HTTPException(status_code=400, detail=f"Unknown notification type: {data.notification_type}")

        return SendNotificationResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending notification: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")


@router.post("/send-custom", response_model=SendNotificationResponse)
async def send_custom_email(
    data: SendCustomEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a custom email with arbitrary subject and HTML body."""
    logger.info(f"Sending custom email to {data.to_email}")
    service = EmailService(db)

    try:
        result = await service.send_email(
            to_email=data.to_email,
            subject=data.subject,
            html_body=data.html_body,
        )
        return SendNotificationResponse(**result)
    except Exception as e:
        logger.error(f"Error sending custom email: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")