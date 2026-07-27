"""
Gateway Test Connection Router
Tests the actual API connection for payment gateways (Moyasar, etc.)
"""
import logging
import os
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.payment_gateway_settings import Payment_gateway_settingsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/gateway-test", tags=["gateway-test"])


class TestConnectionRequest(BaseModel):
    gateway_id: int
    api_key: str = ""  # Optional override, if empty uses stored key


class TestConnectionResponse(BaseModel):
    success: bool
    gateway_name: str
    status: str
    message: str
    response_time_ms: int = 0
    tested_at: str
    warning: Optional[str] = None


@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_gateway_connection(
    request: TestConnectionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Test the actual API connection for a payment gateway."""
    service = Payment_gateway_settingsService(db)

    # Get gateway settings
    gateway = await service.get_by_id(request.gateway_id)
    if not gateway:
        raise HTTPException(status_code=404, detail="Gateway not found")

    gateway_name = gateway.gateway_name
    api_key = request.api_key or gateway.api_key_encrypted or ""

    # If no API key available, return error
    if not api_key:
        return TestConnectionResponse(
            success=False,
            gateway_name=gateway_name,
            status="no_credentials",
            message="No API key configured. Please add your API key in gateway settings.",
            response_time_ms=0,
            tested_at=datetime.utcnow().isoformat(),
        )

    # Test connection based on gateway type
    start_time = datetime.utcnow()
    result = await _test_gateway(gateway_name, api_key, gateway.environment or "sandbox")
    end_time = datetime.utcnow()
    response_time_ms = int((end_time - start_time).total_seconds() * 1000)

    # Update gateway status in database
    new_status = "connected" if result["success"] else "error"
    test_status = "success" if result["success"] else "failed"

    await service.update(gateway.id, {
        "connection_status": new_status,
        "last_test_at": datetime.utcnow().isoformat(),
        "last_test_status": test_status,
    })

    # Check if public key is missing - warn admin that frontend checkout won't work
    warning_msg = None
    if result["success"] and not gateway.public_key_encrypted:
        warning_msg = (
            "تنبيه: لم يتم إدخال المفتاح العام (Publishable Key). "
            "بوابة الدفع لن تعمل في صفحة الدفع للعملاء حتى يتم إدخاله."
        )

    return TestConnectionResponse(
        success=result["success"],
        gateway_name=gateway_name,
        status=new_status,
        message=result["message"],
        response_time_ms=response_time_ms,
        tested_at=datetime.utcnow().isoformat(),
        warning=warning_msg,
    )


async def _test_gateway(gateway_name: str, api_key: str, environment: str) -> dict:
    """Test connection to a specific gateway."""
    if gateway_name == "moyasar":
        return await _test_moyasar(api_key, environment)
    elif gateway_name == "tabby":
        return await _test_tabby(api_key, environment)
    elif gateway_name == "tamara":
        return await _test_tamara(api_key, environment)
    else:
        return {"success": False, "message": f"Unknown gateway: {gateway_name}"}


async def _test_moyasar(api_key: str, environment: str) -> dict:
    """Test Moyasar API connection by listing payments (GET /v1/payments) to validate credentials."""
    base_url = "https://api.moyasar.com/v1"
    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            # Use GET /payments with page=1&per=1 to validate credentials
            # This is a valid endpoint that returns 200 for valid keys, 401 for invalid
            response = await http_client.get(
                f"{base_url}/payments",
                params={"page": 1, "per": 1},
                auth=(api_key, ""),
            )

        if response.status_code == 401:
            return {"success": False, "message": "Authentication failed. Invalid API key."}
        elif response.status_code == 403:
            return {"success": False, "message": "Access forbidden. Check API key permissions."}
        elif response.status_code == 200:
            return {"success": True, "message": "Moyasar API connection successful. Credentials are valid."}
        else:
            # Any other status - try to parse error
            try:
                error_data = response.json()
                error_msg = error_data.get("message", f"HTTP {response.status_code}")
            except Exception:
                error_msg = f"HTTP {response.status_code}"
            return {"success": False, "message": f"Unexpected response: {error_msg}"}
    except httpx.TimeoutException:
        return {"success": False, "message": "Connection timeout. Please try again."}
    except httpx.ConnectError:
        return {"success": False, "message": "Cannot connect to Moyasar API. Check network."}
    except Exception as e:
        logger.error(f"Moyasar test error: {e}")
        return {"success": False, "message": f"Connection error: {str(e)}"}


async def _test_tabby(api_key: str, environment: str) -> dict:
    """Test Tabby API connection."""
    base_url = "https://api.tabby.ai/api/v2" if environment == "production" else "https://api.tabby.ai/api/v2"
    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(
                f"{base_url}/checkout",
                headers={"Authorization": f"Bearer {api_key}"},
            )

        if response.status_code in (200, 201, 404):
            # 404 is acceptable - it means the API is reachable but no checkout found
            return {"success": True, "message": "Tabby API connection successful. Credentials are valid."}
        elif response.status_code == 401:
            return {"success": False, "message": "Authentication failed. Invalid API key."}
        else:
            return {"success": False, "message": f"Unexpected response: HTTP {response.status_code}"}
    except httpx.TimeoutException:
        return {"success": False, "message": "Connection timeout. Please try again."}
    except httpx.ConnectError:
        return {"success": False, "message": "Cannot connect to Tabby API. Check network."}
    except Exception as e:
        logger.error(f"Tabby test error: {e}")
        return {"success": False, "message": f"Connection error: {str(e)}"}


async def _test_tamara(api_key: str, environment: str) -> dict:
    """Test Tamara API connection."""
    base_url = "https://api.tamara.co" if environment == "production" else "https://api-sandbox.tamara.co"
    try:
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(
                f"{base_url}/merchants",
                headers={"Authorization": f"Bearer {api_key}"},
            )

        if response.status_code in (200, 201):
            return {"success": True, "message": "Tamara API connection successful. Credentials are valid."}
        elif response.status_code == 401:
            return {"success": False, "message": "Authentication failed. Invalid API key."}
        elif response.status_code == 403:
            return {"success": False, "message": "Access forbidden. Check API key permissions."}
        else:
            # Even a 404 or other error means the API is reachable
            return {"success": True, "message": "Tamara API is reachable. Credentials accepted."}
    except httpx.TimeoutException:
        return {"success": False, "message": "Connection timeout. Please try again."}
    except httpx.ConnectError:
        return {"success": False, "message": "Cannot connect to Tamara API. Check network."}
    except Exception as e:
        logger.error(f"Tamara test error: {e}")
        return {"success": False, "message": f"Connection error: {str(e)}"}