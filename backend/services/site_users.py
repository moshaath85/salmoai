import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.site_users import Site_users

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class Site_usersService:
    """Service layer for Site_users operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Site_users]:
        """Create a new site_users"""
        try:
            obj = Site_users(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created site_users with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating site_users: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Site_users]:
        """Get site_users by ID"""
        try:
            query = select(Site_users).where(Site_users.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching site_users {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of site_userss"""
        try:
            query = select(Site_users)
            count_query = select(func.count(Site_users.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Site_users, field):
                        query = query.where(getattr(Site_users, field) == value)
                        count_query = count_query.where(getattr(Site_users, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Site_users, field_name):
                        query = query.order_by(getattr(Site_users, field_name).desc())
                else:
                    if hasattr(Site_users, sort):
                        query = query.order_by(getattr(Site_users, sort))
            else:
                query = query.order_by(Site_users.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching site_users list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Site_users]:
        """Update site_users"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Site_users {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated site_users {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating site_users {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete site_users"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Site_users {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted site_users {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting site_users {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Site_users]:
        """Get site_users by any field"""
        try:
            if not hasattr(Site_users, field_name):
                raise ValueError(f"Field {field_name} does not exist on Site_users")
            result = await self.db.execute(
                select(Site_users).where(getattr(Site_users, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching site_users by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Site_users]:
        """Get list of site_userss filtered by field"""
        try:
            if not hasattr(Site_users, field_name):
                raise ValueError(f"Field {field_name} does not exist on Site_users")
            result = await self.db.execute(
                select(Site_users)
                .where(getattr(Site_users, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Site_users.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching site_userss by {field_name}: {str(e)}")
            raise