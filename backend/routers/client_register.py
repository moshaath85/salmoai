import logging

from core.database import get_db
from fastapi import APIRouter, Depends, HTTPException, status
from schemas.clients import ClientRegisterRequest, ClientRegisterResponse, ClientResponse
from services.auth import AuthService
from services.clients import ClientsService
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from models.site_users import Site_users
from models.clients import Clients

router = APIRouter(prefix="/api/v1/clients", tags=["clients-registration"])
logger = logging.getLogger(__name__)


@router.post("/register", response_model=ClientRegisterResponse)
async def register_client(
    payload: ClientRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint: Register a new client and create a client_admin user."""
    # Validate email not already used
    result = await db.execute(
        select(Site_users).where(Site_users.email == payload.email)
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="البريد الإلكتروني مسجل مسبقاً",
        )

    # Check if client email already exists
    result = await db.execute(
        select(Clients).where(Clients.email == payload.email)
    )
    existing_client = result.scalar_one_or_none()
    if existing_client:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="البريد الإلكتروني مسجل مسبقاً",
        )

    # Create client record
    clients_service = ClientsService(db)
    client = await clients_service.create({
        "company_name": payload.company_name,
        "owner_name": payload.full_name,
        "email": payload.email,
        "mobile": payload.mobile,
        "status": "pending_payment",
    })

    if not client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="فشل في إنشاء حساب العميل",
        )

    # Create user linked to this client
    auth_service = AuthService(db)
    user = await auth_service.create_user(
        username=payload.email,
        email=payload.email,
        password=payload.password,
        name=payload.full_name,
        role="client_admin",
        customer_id=client.id,
    )

    # Issue token for the new user
    token, expires_at, claims = await auth_service.issue_app_token(user)

    logger.info(f"Client registered: {client.id}, user: {user.id}")

    return ClientRegisterResponse(
        token=token,
        token_type="Bearer",
        client=ClientResponse(
            id=client.id,
            company_name=client.company_name,
            owner_name=client.owner_name,
            email=client.email,
            mobile=client.mobile,
            status=client.status or "pending_payment",
            created_at=client.created_at,
        ),
        user={
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role,
        },
    )