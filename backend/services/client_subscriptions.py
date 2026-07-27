import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.client_subscriptions import Client_subscriptions

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Client_subscriptionsService:
    """Service layer for Client_subscriptions operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Client_subscriptions]:
        """Create a new client_subscriptions"""
        try:
            if user_id:
                data['user_id'] = user_id
            obj = Client_subscriptions(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created client_subscriptions with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating client_subscriptions: {str(e)}")
            raise

    async def check_ownership(self, obj_id: int, user_id: str) -> bool:
        """Check if user owns this record"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            return obj is not None
        except Exception as e:
            logger.error(f"Error checking ownership for client_subscriptions {obj_id}: {str(e)}")
            return False

    async def get_by_id(self, obj_id: int, user_id: Optional[str] = None) -> Optional[Client_subscriptions]:
        """Get client_subscriptions by ID (user can only see their own records)"""
        try:
            query = select(Client_subscriptions).where(Client_subscriptions.id == obj_id)
            if user_id:
                query = query.where(Client_subscriptions.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching client_subscriptions {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        user_id: Optional[str] = None,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of client_subscriptionss (user can only see their own records)"""
        try:
            query = select(Client_subscriptions)
            count_query = select(func.count(Client_subscriptions.id))
            
            if user_id:
                query = query.where(Client_subscriptions.user_id == user_id)
                count_query = count_query.where(Client_subscriptions.user_id == user_id)
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Client_subscriptions, field):
                        query = query.where(getattr(Client_subscriptions, field) == value)
                        count_query = count_query.where(getattr(Client_subscriptions, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Client_subscriptions, field_name):
                        query = query.order_by(getattr(Client_subscriptions, field_name).desc())
                else:
                    if hasattr(Client_subscriptions, sort):
                        query = query.order_by(getattr(Client_subscriptions, sort))
            else:
                query = query.order_by(Client_subscriptions.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching client_subscriptions list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any], user_id: Optional[str] = None) -> Optional[Client_subscriptions]:
        """Update client_subscriptions (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Client_subscriptions {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key) and key != 'user_id':
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated client_subscriptions {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating client_subscriptions {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int, user_id: Optional[str] = None) -> bool:
        """Delete client_subscriptions (requires ownership)"""
        try:
            obj = await self.get_by_id(obj_id, user_id=user_id)
            if not obj:
                logger.warning(f"Client_subscriptions {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted client_subscriptions {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting client_subscriptions {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Client_subscriptions]:
        """Get client_subscriptions by any field"""
        try:
            if not hasattr(Client_subscriptions, field_name):
                raise ValueError(f"Field {field_name} does not exist on Client_subscriptions")
            result = await self.db.execute(
                select(Client_subscriptions).where(getattr(Client_subscriptions, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching client_subscriptions by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Client_subscriptions]:
        """Get list of client_subscriptionss filtered by field"""
        try:
            if not hasattr(Client_subscriptions, field_name):
                raise ValueError(f"Field {field_name} does not exist on Client_subscriptions")
            result = await self.db.execute(
                select(Client_subscriptions)
                .where(getattr(Client_subscriptions, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Client_subscriptions.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching client_subscriptionss by {field_name}: {str(e)}")
            raise