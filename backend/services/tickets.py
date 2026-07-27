import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.tickets import Tickets

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class TicketsService:
    """Service layer for Tickets operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Tickets]:
        """Create a new tickets"""
        try:
            obj = Tickets(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created tickets with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating tickets: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Tickets]:
        """Get tickets by ID"""
        try:
            query = select(Tickets).where(Tickets.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching tickets {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of ticketss"""
        try:
            query = select(Tickets)
            count_query = select(func.count(Tickets.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Tickets, field):
                        query = query.where(getattr(Tickets, field) == value)
                        count_query = count_query.where(getattr(Tickets, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Tickets, field_name):
                        query = query.order_by(getattr(Tickets, field_name).desc())
                else:
                    if hasattr(Tickets, sort):
                        query = query.order_by(getattr(Tickets, sort))
            else:
                query = query.order_by(Tickets.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching tickets list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Tickets]:
        """Update tickets"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Tickets {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated tickets {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating tickets {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete tickets"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Tickets {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted tickets {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting tickets {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Tickets]:
        """Get tickets by any field"""
        try:
            if not hasattr(Tickets, field_name):
                raise ValueError(f"Field {field_name} does not exist on Tickets")
            result = await self.db.execute(
                select(Tickets).where(getattr(Tickets, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching tickets by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Tickets]:
        """Get list of ticketss filtered by field"""
        try:
            if not hasattr(Tickets, field_name):
                raise ValueError(f"Field {field_name} does not exist on Tickets")
            result = await self.db.execute(
                select(Tickets)
                .where(getattr(Tickets, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Tickets.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching ticketss by {field_name}: {str(e)}")
            raise