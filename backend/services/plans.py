import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.plans import Plans

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class PlansService:
    """Service layer for Plans operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Plans]:
        """Create a new plans"""
        try:
            obj = Plans(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created plans with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating plans: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Plans]:
        """Get plans by ID"""
        try:
            query = select(Plans).where(Plans.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching plans {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of planss"""
        try:
            query = select(Plans)
            count_query = select(func.count(Plans.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Plans, field):
                        query = query.where(getattr(Plans, field) == value)
                        count_query = count_query.where(getattr(Plans, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Plans, field_name):
                        query = query.order_by(getattr(Plans, field_name).desc())
                else:
                    if hasattr(Plans, sort):
                        query = query.order_by(getattr(Plans, sort))
            else:
                query = query.order_by(Plans.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching plans list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Plans]:
        """Update plans"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Plans {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated plans {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating plans {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete plans"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Plans {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted plans {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting plans {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Plans]:
        """Get plans by any field"""
        try:
            if not hasattr(Plans, field_name):
                raise ValueError(f"Field {field_name} does not exist on Plans")
            result = await self.db.execute(
                select(Plans).where(getattr(Plans, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching plans by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Plans]:
        """Get list of planss filtered by field"""
        try:
            if not hasattr(Plans, field_name):
                raise ValueError(f"Field {field_name} does not exist on Plans")
            result = await self.db.execute(
                select(Plans)
                .where(getattr(Plans, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Plans.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching planss by {field_name}: {str(e)}")
            raise