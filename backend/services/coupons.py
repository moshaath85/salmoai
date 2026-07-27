import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, date

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from models.coupons import Coupons
from models.coupon_usages import Coupon_usages

logger = logging.getLogger(__name__)


class CouponsService:
    """Service layer for Coupons operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Coupons]:
        """Create a new coupon"""
        try:
            code = data.get("code", "")
            if code:
                existing = await self.get_by_code(code)
                if existing:
                    raise ValueError(f"Coupon code '{code}' already exists")
            obj = Coupons(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created coupon with id: {obj.id}")
            return obj
        except ValueError:
            raise
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating coupon: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Coupons]:
        """Get coupon by ID"""
        try:
            query = select(Coupons).where(Coupons.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching coupon {obj_id}: {str(e)}")
            raise

    async def get_by_code(self, code: str) -> Optional[Coupons]:
        """Get coupon by code"""
        try:
            query = select(Coupons).where(Coupons.code == code.upper())
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching coupon by code {code}: {str(e)}")
            raise

    async def get_list(
        self,
        skip: int = 0,
        limit: int = 20,
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of coupons"""
        try:
            query = select(Coupons)
            count_query = select(func.count(Coupons.id))

            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Coupons, field):
                        query = query.where(getattr(Coupons, field) == value)
                        count_query = count_query.where(getattr(Coupons, field) == value)

            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Coupons, field_name):
                        query = query.order_by(getattr(Coupons, field_name).desc())
                else:
                    if hasattr(Coupons, sort):
                        query = query.order_by(getattr(Coupons, sort))
            else:
                query = query.order_by(Coupons.created_at.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching coupons list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Coupons]:
        """Update coupon"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated coupon {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating coupon {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete coupon"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted coupon {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting coupon {obj_id}: {str(e)}")
            raise

    async def validate_coupon(
        self,
        code: str,
        plan_id: int,
        billing_cycle: str,
        amount: float,
        user_id: str,
    ) -> Dict[str, Any]:
        """Validate a coupon and calculate discount"""
        coupon = await self.get_by_code(code.upper())
        if not coupon:
            return {"valid": False, "error": "كود الكوبون غير صحيح", "error_en": "Invalid coupon code"}

        if not coupon.is_active:
            return {"valid": False, "error": "هذا الكوبون غير نشط", "error_en": "This coupon is inactive"}

        if coupon.starts_at:
            try:
                start_date = datetime.strptime(coupon.starts_at, "%Y-%m-%d").date()
                if date.today() < start_date:
                    return {"valid": False, "error": "هذا الكوبون لم يبدأ بعد", "error_en": "This coupon has not started yet"}
            except ValueError:
                pass

        if coupon.expires_at:
            try:
                expiry_date = datetime.strptime(coupon.expires_at, "%Y-%m-%d").date()
                if date.today() > expiry_date:
                    return {"valid": False, "error": "هذا الكوبون منتهي الصلاحية", "error_en": "This coupon has expired"}
            except ValueError:
                pass

        if coupon.max_uses and coupon.usage_count and coupon.usage_count >= coupon.max_uses:
            return {"valid": False, "error": "تم استنفاد عدد الاستخدامات المتاحة", "error_en": "Coupon usage limit reached"}

        if coupon.max_uses_per_user:
            user_usage_count = await self._get_user_usage_count(coupon.id, user_id)
            if user_usage_count >= coupon.max_uses_per_user:
                return {"valid": False, "error": "لقد استخدمت هذا الكوبون من قبل", "error_en": "You have already used this coupon"}

        if coupon.applicable_plans:
            try:
                allowed_plans = json.loads(coupon.applicable_plans)
                if allowed_plans and plan_id not in allowed_plans:
                    return {"valid": False, "error": "هذا الكوبون غير متاح لهذه الباقة", "error_en": "This coupon is not applicable to this plan"}
            except (json.JSONDecodeError, TypeError):
                pass

        if coupon.applicable_cycles:
            try:
                allowed_cycles = json.loads(coupon.applicable_cycles)
                if allowed_cycles and billing_cycle not in allowed_cycles:
                    return {"valid": False, "error": "هذا الكوبون غير متاح لهذه الدورة", "error_en": "This coupon is not applicable to this billing cycle"}
            except (json.JSONDecodeError, TypeError):
                pass

        if coupon.coupon_type == "first_purchase":
            has_previous = await self._user_has_previous_subscription(user_id)
            if has_previous:
                return {"valid": False, "error": "هذا الكوبون متاح لأول عملية شراء فقط", "error_en": "This coupon is for first purchase only"}

        if coupon.min_amount and amount < coupon.min_amount:
            return {"valid": False, "error": f"الحد الأدنى للطلب {coupon.min_amount} ر.س", "error_en": f"Minimum order amount is {coupon.min_amount} SAR"}

        discount_amount = self._calculate_discount(coupon, amount)

        if coupon.max_discount_amount and discount_amount > coupon.max_discount_amount:
            discount_amount = coupon.max_discount_amount

        final_amount = max(0, amount - discount_amount)

        return {
            "valid": True,
            "coupon_id": coupon.id,
            "code": coupon.code,
            "discount_type": coupon.discount_type,
            "discount_value": coupon.discount,
            "discount_amount": round(discount_amount, 2),
            "original_amount": amount,
            "final_amount": round(final_amount, 2),
            "description_ar": coupon.description_ar or f"خصم {coupon.discount}{'%' if coupon.discount_type == 'percentage' else ' ر.س'}",
            "description_en": coupon.description_en or f"{coupon.discount}{'%' if coupon.discount_type == 'percentage' else ' SAR'} discount",
            "trial_days": coupon.trial_days if coupon.discount_type == "free_trial" else None,
        }

    def _calculate_discount(self, coupon: Coupons, amount: float) -> float:
        """Calculate discount amount based on coupon type"""
        try:
            discount_value = float(coupon.discount)
        except (ValueError, TypeError):
            return 0

        if coupon.discount_type == "percentage":
            return amount * (discount_value / 100)
        elif coupon.discount_type == "fixed":
            return min(discount_value, amount)
        elif coupon.discount_type == "free_trial":
            return amount
        elif coupon.discount_type == "time_limited":
            return amount * (discount_value / 100)
        else:
            return 0

    async def apply_coupon(
        self,
        code: str,
        plan_id: int,
        billing_cycle: str,
        amount: float,
        user_id: str,
    ) -> Dict[str, Any]:
        """Apply coupon and record usage"""
        validation = await self.validate_coupon(code, plan_id, billing_cycle, amount, user_id)
        if not validation["valid"]:
            return validation

        usage = Coupon_usages(
            coupon_id=validation["coupon_id"],
            coupon_code=code.upper(),
            user_id=user_id,
            plan_id=plan_id,
            billing_cycle=billing_cycle,
            original_amount=amount,
            discount_amount=validation["discount_amount"],
            final_amount=validation["final_amount"],
        )
        self.db.add(usage)

        coupon = await self.get_by_id(validation["coupon_id"])
        if coupon:
            coupon.usage_count = (coupon.usage_count or 0) + 1

        await self.db.commit()
        logger.info(f"Applied coupon {code} for user {user_id}, discount: {validation['discount_amount']}")

        return validation

    async def get_coupon_stats(self, coupon_id: int) -> Dict[str, Any]:
        """Get usage statistics for a coupon"""
        try:
            count_query = select(func.count(Coupon_usages.id)).where(Coupon_usages.coupon_id == coupon_id)
            count_result = await self.db.execute(count_query)
            total_uses = count_result.scalar() or 0

            discount_query = select(func.sum(Coupon_usages.discount_amount)).where(Coupon_usages.coupon_id == coupon_id)
            discount_result = await self.db.execute(discount_query)
            total_discount = discount_result.scalar() or 0

            revenue_query = select(func.sum(Coupon_usages.final_amount)).where(Coupon_usages.coupon_id == coupon_id)
            revenue_result = await self.db.execute(revenue_query)
            total_revenue = revenue_result.scalar() or 0

            users_query = select(func.count(func.distinct(Coupon_usages.user_id))).where(Coupon_usages.coupon_id == coupon_id)
            users_result = await self.db.execute(users_query)
            unique_users = users_result.scalar() or 0

            return {
                "total_uses": total_uses,
                "total_discount": round(float(total_discount), 2),
                "total_revenue": round(float(total_revenue), 2),
                "unique_users": unique_users,
            }
        except Exception as e:
            logger.error(f"Error getting coupon stats: {str(e)}")
            return {"total_uses": 0, "total_discount": 0, "total_revenue": 0, "unique_users": 0}

    async def get_usage_logs(
        self, coupon_id: Optional[int] = None, skip: int = 0, limit: int = 50
    ) -> Dict[str, Any]:
        """Get coupon usage logs"""
        try:
            query = select(Coupon_usages)
            count_query = select(func.count(Coupon_usages.id))

            if coupon_id:
                query = query.where(Coupon_usages.coupon_id == coupon_id)
                count_query = count_query.where(Coupon_usages.coupon_id == coupon_id)

            count_result = await self.db.execute(count_query)
            total = count_result.scalar() or 0

            query = query.order_by(Coupon_usages.id.desc()).offset(skip).limit(limit)
            result = await self.db.execute(query)
            items = result.scalars().all()

            return {"items": items, "total": total, "skip": skip, "limit": limit}
        except Exception as e:
            logger.error(f"Error fetching usage logs: {str(e)}")
            raise

    async def _get_user_usage_count(self, coupon_id: int, user_id: str) -> int:
        """Get how many times a user has used a specific coupon"""
        try:
            query = select(func.count(Coupon_usages.id)).where(
                and_(Coupon_usages.coupon_id == coupon_id, Coupon_usages.user_id == user_id)
            )
            result = await self.db.execute(query)
            return result.scalar() or 0
        except Exception as e:
            logger.error(f"Error checking user usage: {str(e)}")
            return 0

    async def _user_has_previous_subscription(self, user_id: str) -> bool:
        """Check if user has any previous coupon usage"""
        try:
            query = select(func.count(Coupon_usages.id)).where(Coupon_usages.user_id == user_id)
            result = await self.db.execute(query)
            count = result.scalar() or 0
            return count > 0
        except Exception as e:
            logger.error(f"Error checking previous subscriptions: {str(e)}")
            return False

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Coupons]:
        """Get coupon by any field"""
        try:
            if not hasattr(Coupons, field_name):
                raise ValueError(f"Field {field_name} does not exist on Coupons")
            result = await self.db.execute(
                select(Coupons).where(getattr(Coupons, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching coupon by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Coupons]:
        """Get list of coupons filtered by field"""
        try:
            if not hasattr(Coupons, field_name):
                raise ValueError(f"Field {field_name} does not exist on Coupons")
            result = await self.db.execute(
                select(Coupons)
                .where(getattr(Coupons, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Coupons.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching coupons by {field_name}: {str(e)}")
            raise