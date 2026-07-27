"""
Moyasar Payment Service for Saudi Arabia
Supports: Mada, Visa/Mastercard, Apple Pay
API Docs: https://moyasar.com/docs/api/
"""
import logging
import os
from typing import Optional

import httpx
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

MOYASAR_API_BASE = "https://api.moyasar.com/v1"


class MoyasarPaymentRequest(BaseModel):
    """Request to create a Moyasar payment"""
    amount: int = Field(..., description="Amount in halalas (smallest unit). 100 = 1 SAR")
    currency: str = Field("SAR", description="Currency code")
    description: str = Field(..., description="Payment description")
    callback_url: str = Field(..., description="URL to redirect after payment")
    source_type: str = Field("creditcard", description="Payment source: creditcard, mada, applepay")
    metadata: Optional[dict] = Field(None, description="Additional metadata")


class MoyasarPaymentResponse(BaseModel):
    """Response from Moyasar payment creation"""
    id: str
    status: str
    amount: int
    currency: str
    description: str
    source_type: Optional[str] = None
    url: Optional[str] = None  # Payment form URL for hosted checkout


class MoyasarPaymentStatus(BaseModel):
    """Payment status response"""
    id: str
    status: str
    amount: int
    currency: str
    description: str
    source_type: Optional[str] = None
    source_company: Optional[str] = None
    source_name: Optional[str] = None
    metadata: Optional[dict] = None


class MoyasarService:
    """Service for Moyasar payment gateway integration.
    
    Reads API keys from the payment_gateway_settings database table.
    Falls back to environment variables if no database entry is found.
    """

    def __init__(self, db: Optional[AsyncSession] = None):
        self._db = db
        self._api_key: Optional[str] = None
        self._publishable_key: Optional[str] = None
        self._keys_loaded = False

    async def _load_keys_from_db(self) -> bool:
        """Load Moyasar API keys from the payment_gateway_settings database table.
        
        Uses case-insensitive lookup for gateway_name and falls back to finding
        any active gateway with a non-null public_key_encrypted.
        
        Returns True if keys were successfully loaded from the database.
        """
        if not self._db:
            return False

        try:
            from sqlalchemy import select, func
            from models.payment_gateway_settings import Payment_gateway_settings
            from services.payment_gateway_settings import Payment_gateway_settingsService

            service = Payment_gateway_settingsService(self._db)

            # Step 1: Try exact match first
            gateway = await service.get_by_field("gateway_name", "moyasar")
            logger.info(
                f"Moyasar gateway lookup (exact 'moyasar'): found={gateway is not None}, "
                f"gateway_name={gateway.gateway_name if gateway else None}, "
                f"has_public_key={bool(gateway.public_key_encrypted) if gateway else None}"
            )

            # Step 2: If not found, try case-insensitive lookup
            if not gateway:
                logger.info("Exact match failed, trying case-insensitive lookup...")
                result = await self._db.execute(
                    select(Payment_gateway_settings).where(
                        func.lower(Payment_gateway_settings.gateway_name) == "moyasar"
                    )
                )
                gateway = result.scalar_one_or_none()
                logger.info(
                    f"Case-insensitive lookup: found={gateway is not None}, "
                    f"gateway_name={gateway.gateway_name if gateway else None}, "
                    f"has_public_key={bool(gateway.public_key_encrypted) if gateway else None}"
                )

            # Step 3: If still not found, try to find ANY active gateway with a public key
            if not gateway:
                logger.info("Case-insensitive lookup failed, trying any active gateway with public key...")
                result = await self._db.execute(
                    select(Payment_gateway_settings).where(
                        Payment_gateway_settings.public_key_encrypted.isnot(None),
                        Payment_gateway_settings.public_key_encrypted != "",
                    )
                )
                gateway = result.scalars().first()
                if gateway:
                    logger.info(
                        f"Fallback found gateway: gateway_name={gateway.gateway_name}, "
                        f"has_public_key={bool(gateway.public_key_encrypted)}"
                    )

            # Step 4: If still nothing, log all gateways for diagnostics
            if not gateway:
                all_result = await self._db.execute(select(Payment_gateway_settings))
                all_gateways = all_result.scalars().all()
                gateway_names = [
                    f"(id={g.id}, name='{g.gateway_name}', has_pub_key={bool(g.public_key_encrypted)})"
                    for g in all_gateways
                ]
                logger.warning(
                    f"No Moyasar gateway found. All gateways in DB: {gateway_names}"
                )
                return False

            # Extract keys from the found gateway
            if gateway.api_key_encrypted:
                self._api_key = gateway.api_key_encrypted
            if gateway.public_key_encrypted:
                self._publishable_key = gateway.public_key_encrypted
            # Also check secret_key_encrypted as an alternative for the API key
            if not self._api_key and gateway.secret_key_encrypted:
                self._api_key = gateway.secret_key_encrypted

            logger.info(
                f"Moyasar keys loaded from database: "
                f"has_api_key={bool(self._api_key)}, "
                f"has_publishable_key={bool(self._publishable_key)}, "
                f"public_key_preview={self._publishable_key[:12] + '...' if self._publishable_key else None}"
            )
            return True
        except Exception as e:
            logger.warning(f"Failed to load Moyasar keys from database: {e}", exc_info=True)
            return False

    async def _ensure_keys_loaded(self):
        """Ensure API keys are loaded, trying database first then env vars."""
        if self._keys_loaded:
            return

        # Try loading from database first
        db_loaded = await self._load_keys_from_db()

        # Fall back to environment variables if database didn't provide keys
        if not self._api_key:
            env_key = os.environ.get("MOYASAR_API_KEY", "")
            # Only use env var if it looks like an actual API key (not a URL)
            if env_key and not env_key.startswith("http"):
                self._api_key = env_key
                logger.info("Moyasar API key loaded from environment variable")

        if not self._publishable_key:
            env_pub_key = os.environ.get("MOYASAR_PUBLISHABLE_KEY", "")
            # Only use env var if it looks like an actual key (not a URL)
            if env_pub_key and not env_pub_key.startswith("http"):
                self._publishable_key = env_pub_key
                logger.info("Moyasar publishable key loaded from environment variable")

        self._keys_loaded = True

    def _get_auth(self):
        """Get HTTP Basic Auth tuple for Moyasar API"""
        return (self._api_key or "", "")

    async def create_payment(self, request: MoyasarPaymentRequest) -> MoyasarPaymentResponse:
        """
        Create a payment using Moyasar API.
        For hosted form, we return the payment ID and the frontend uses Moyasar.js
        """
        await self._ensure_keys_loaded()

        if not self._api_key:
            raise MoyasarError("Moyasar API key not configured. Please set it in Payment Gateway Settings.")

        payload = {
            "amount": request.amount,
            "currency": request.currency,
            "description": request.description,
            "callback_url": request.callback_url,
            "source": {
                "type": request.source_type,
            },
        }

        if request.metadata:
            payload["metadata"] = request.metadata

        logger.info(
            f"Creating Moyasar payment: amount={request.amount}, currency={request.currency}, "
            f"source_type={request.source_type}, callback_url={request.callback_url}"
        )

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{MOYASAR_API_BASE}/payments",
                    json=payload,
                    auth=self._get_auth(),
                    timeout=30.0,
                )

                logger.info(f"Moyasar API response: status={response.status_code}")

                if response.status_code in (200, 201):
                    data = response.json()
                    logger.info(f"Payment created successfully: id={data.get('id')}, status={data.get('status')}")
                    return MoyasarPaymentResponse(
                        id=data["id"],
                        status=data["status"],
                        amount=data["amount"],
                        currency=data["currency"],
                        description=data["description"],
                        source_type=data.get("source", {}).get("type"),
                        url=data.get("source", {}).get("transaction_url"),
                    )
                else:
                    try:
                        error_data = response.json()
                        error_msg = error_data.get("message", response.text)
                        error_type = error_data.get("type", "unknown")
                        error_errors = error_data.get("errors", {})
                    except Exception:
                        error_msg = response.text
                        error_type = "parse_error"
                        error_errors = {}
                    logger.error(
                        f"Moyasar API error: status={response.status_code}, type={error_type}, "
                        f"message={error_msg}, errors={error_errors}"
                    )
                    raise MoyasarError(f"Payment creation failed: {error_msg}")

        except httpx.RequestError as e:
            logger.error(f"Moyasar network error: {e}")
            raise MoyasarError(f"Network error connecting to Moyasar: {str(e)}")

    async def get_payment(self, payment_id: str) -> MoyasarPaymentStatus:
        """Retrieve payment status from Moyasar"""
        await self._ensure_keys_loaded()

        if not self._api_key:
            raise MoyasarError("Moyasar API key not configured. Please set it in Payment Gateway Settings.")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{MOYASAR_API_BASE}/payments/{payment_id}",
                    auth=self._get_auth(),
                    timeout=30.0,
                )

                if response.status_code == 200:
                    data = response.json()
                    source = data.get("source", {})
                    return MoyasarPaymentStatus(
                        id=data["id"],
                        status=data["status"],
                        amount=data["amount"],
                        currency=data["currency"],
                        description=data["description"],
                        source_type=source.get("type"),
                        source_company=source.get("company"),
                        source_name=source.get("name"),
                        metadata=data.get("metadata"),
                    )
                elif response.status_code == 404:
                    raise MoyasarError(f"Payment {payment_id} not found")
                else:
                    error_data = response.json()
                    error_msg = error_data.get("message", response.text)
                    raise MoyasarError(f"Failed to retrieve payment: {error_msg}")

        except httpx.RequestError as e:
            logger.error(f"Moyasar network error: {e}")
            raise MoyasarError(f"Network error connecting to Moyasar: {str(e)}")

    async def get_publishable_key(self) -> str:
        """Return the publishable key for frontend use"""
        await self._ensure_keys_loaded()
        return self._publishable_key or ""


class MoyasarError(Exception):
    """Custom exception for Moyasar payment errors"""
    pass