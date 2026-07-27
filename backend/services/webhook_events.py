import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.webhook_events import Webhook_events

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Webhook_eventsService:
    """Service layer for Webhook_events operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Webhook_events]:
        """Create a new webhook_events"""
        try:
            obj = Webhook_events(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created webhook_events with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating webhook_events: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Webhook_events]:
        """Get webhook_events by ID"""
        try:
            query = select(Webhook_events).where(Webhook_events.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching webhook_events {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of webhook_eventss"""
        try:
            query = select(Webhook_events)
            count_query = select(func.count(Webhook_events.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Webhook_events, field):
                        query = query.where(getattr(Webhook_events, field) == value)
                        count_query = count_query.where(getattr(Webhook_events, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Webhook_events, field_name):
                        query = query.order_by(getattr(Webhook_events, field_name).desc())
                else:
                    if hasattr(Webhook_events, sort):
                        query = query.order_by(getattr(Webhook_events, sort))
            else:
                query = query.order_by(Webhook_events.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching webhook_events list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Webhook_events]:
        """Update webhook_events"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Webhook_events {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated webhook_events {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating webhook_events {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete webhook_events"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Webhook_events {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted webhook_events {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting webhook_events {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Webhook_events]:
        """Get webhook_events by any field"""
        try:
            if not hasattr(Webhook_events, field_name):
                raise ValueError(f"Field {field_name} does not exist on Webhook_events")
            result = await self.db.execute(
                select(Webhook_events).where(getattr(Webhook_events, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching webhook_events by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Webhook_events]:
        """Get list of webhook_eventss filtered by field"""
        try:
            if not hasattr(Webhook_events, field_name):
                raise ValueError(f"Field {field_name} does not exist on Webhook_events")
            result = await self.db.execute(
                select(Webhook_events)
                .where(getattr(Webhook_events, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Webhook_events.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching webhook_eventss by {field_name}: {str(e)}")
            raise