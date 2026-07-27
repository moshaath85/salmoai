import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.payment_gateway_settings import Payment_gateway_settings

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Payment_gateway_settingsService:
    """Service layer for Payment_gateway_settings operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Payment_gateway_settings]:
        """Create a new payment_gateway_settings"""
        try:
            obj = Payment_gateway_settings(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created payment_gateway_settings with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating payment_gateway_settings: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Payment_gateway_settings]:
        """Get payment_gateway_settings by ID"""
        try:
            query = select(Payment_gateway_settings).where(Payment_gateway_settings.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching payment_gateway_settings {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of payment_gateway_settingss"""
        try:
            query = select(Payment_gateway_settings)
            count_query = select(func.count(Payment_gateway_settings.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Payment_gateway_settings, field):
                        query = query.where(getattr(Payment_gateway_settings, field) == value)
                        count_query = count_query.where(getattr(Payment_gateway_settings, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Payment_gateway_settings, field_name):
                        query = query.order_by(getattr(Payment_gateway_settings, field_name).desc())
                else:
                    if hasattr(Payment_gateway_settings, sort):
                        query = query.order_by(getattr(Payment_gateway_settings, sort))
            else:
                query = query.order_by(Payment_gateway_settings.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching payment_gateway_settings list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Payment_gateway_settings]:
        """Update payment_gateway_settings"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Payment_gateway_settings {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated payment_gateway_settings {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating payment_gateway_settings {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete payment_gateway_settings"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Payment_gateway_settings {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted payment_gateway_settings {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting payment_gateway_settings {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Payment_gateway_settings]:
        """Get payment_gateway_settings by any field"""
        try:
            if not hasattr(Payment_gateway_settings, field_name):
                raise ValueError(f"Field {field_name} does not exist on Payment_gateway_settings")
            result = await self.db.execute(
                select(Payment_gateway_settings).where(getattr(Payment_gateway_settings, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching payment_gateway_settings by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Payment_gateway_settings]:
        """Get list of payment_gateway_settingss filtered by field"""
        try:
            if not hasattr(Payment_gateway_settings, field_name):
                raise ValueError(f"Field {field_name} does not exist on Payment_gateway_settings")
            result = await self.db.execute(
                select(Payment_gateway_settings)
                .where(getattr(Payment_gateway_settings, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Payment_gateway_settings.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching payment_gateway_settingss by {field_name}: {str(e)}")
            raise