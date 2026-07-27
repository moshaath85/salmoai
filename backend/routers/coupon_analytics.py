import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.coupons import Coupons
from models.coupon_usages import Coupon_usages
from models.notifications import Notifications

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/coupon-analytics", tags=["coupon-analytics"])


def parse_date_string(date_str: Optional[str]) -> Optional[datetime]:
    """Parse various date string formats to datetime"""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(date_str, fmt).replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
    return None


# ---------- Pydantic Schemas ----------
class CouponExpiryAlert(BaseModel):
    coupon_id: int
    code: str
    expires_at: str
    days_remaining: int
    is_active: bool
    usage_count: int


class CouponUsageStat(BaseModel):
    date: str
    usage_count: int
    total_discount: float
    total_revenue: float


class CouponPerformance(BaseModel):
    coupon_id: int
    code: str
    discount_type: str
    usage_count: int
    total_discount: float
    total_revenue: float
    redemption_rate: float
    avg_discount: float


class AnalyticsSummary(BaseModel):
    total_coupons: int
    active_coupons: int
    total_redemptions: int
    total_discount_given: float
    total_revenue_with_coupons: float
    avg_redemption_rate: float
    expiring_soon: int


class DailyUsageData(BaseModel):
    date: str
    redemptions: int
    discount_amount: float
    revenue: float


# ---------- Routes ----------
@router.get("/expiring-coupons", response_model=List[CouponExpiryAlert])
async def get_expiring_coupons(
    days: int = Query(7, ge=1, le=30, description="Days until expiry"),
    db: AsyncSession = Depends(get_db),
):
    """Get coupons expiring within specified days"""
    try:
        now = datetime.now(timezone.utc)
        threshold = now + timedelta(days=days)

        # expires_at is stored as String, so fetch all with non-null expires_at and filter in Python
        query = select(Coupons).where(
            Coupons.expires_at.isnot(None),
        )

        result = await db.execute(query)
        coupons = result.scalars().all()

        alerts = []
        for c in coupons:
            exp_date = parse_date_string(c.expires_at)
            if not exp_date:
                continue
            if exp_date <= now or exp_date > threshold:
                continue
            days_remaining = (exp_date - now).days
            alerts.append(CouponExpiryAlert(
                coupon_id=c.id,
                code=c.code,
                expires_at=c.expires_at or "",
                days_remaining=max(0, days_remaining),
                is_active=c.is_active if c.is_active is not None else True,
                usage_count=c.usage_count if c.usage_count else 0,
            ))

        alerts.sort(key=lambda x: x.days_remaining)
        return alerts
    except Exception as e:
        logger.error(f"Error fetching expiring coupons: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/check-and-notify")
async def check_and_notify_expiring(
    days: int = Query(7, ge=1, le=30),
    db: AsyncSession = Depends(get_db),
):
    """Check for expiring coupons and create notifications for admins"""
    try:
        now = datetime.now(timezone.utc)
        threshold = now + timedelta(days=days)

        query = select(Coupons).where(
            and_(
                Coupons.expires_at.isnot(None),
                Coupons.is_active == True,
            )
        )

        result = await db.execute(query)
        coupons = result.scalars().all()

        expiring_coupons = []
        for c in coupons:
            exp_date = parse_date_string(c.expires_at)
            if not exp_date:
                continue
            if exp_date > now and exp_date <= threshold:
                expiring_coupons.append((c, (exp_date - now).days))

        notifications_created = 0
        for c, days_remaining in expiring_coupons:
            # Check if notification already exists for this coupon (within last day)
            existing = await db.execute(
                select(Notifications).where(
                    and_(
                        Notifications.type == "coupon_expiry",
                        Notifications.message.contains(c.code),
                        Notifications.created_at > now - timedelta(days=1),
                    )
                )
            )
            if existing.scalar_one_or_none():
                continue

            notif = Notifications(
                type="coupon_expiry",
                title=f"Coupon Expiring Soon: {c.code}",
                message=f"Coupon '{c.code}' will expire in {days_remaining} day(s). Current usage: {c.usage_count or 0} times.",
                is_read=False,
                target_user_id="admin",
            )
            db.add(notif)
            notifications_created += 1

        await db.commit()
        return {
            "message": f"Checked {len(expiring_coupons)} expiring coupons, created {notifications_created} new notifications",
            "expiring_count": len(expiring_coupons),
            "notifications_created": notifications_created,
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in check-and-notify: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(
    db: AsyncSession = Depends(get_db),
):
    """Get overall coupon analytics summary"""
    try:
        now = datetime.now(timezone.utc)
        threshold = now + timedelta(days=7)

        # Total and active coupons
        total_result = await db.execute(select(func.count(Coupons.id)))
        total_coupons = total_result.scalar() or 0

        active_result = await db.execute(
            select(func.count(Coupons.id)).where(Coupons.is_active == True)
        )
        active_coupons = active_result.scalar() or 0

        # Expiring soon - expires_at is a String, filter in Python
        expiring_query = await db.execute(
            select(Coupons).where(
                and_(
                    Coupons.expires_at.isnot(None),
                    Coupons.is_active == True,
                )
            )
        )
        all_expiring_candidates = expiring_query.scalars().all()
        expiring_soon = 0
        for c in all_expiring_candidates:
            exp_date = parse_date_string(c.expires_at)
            if exp_date and exp_date > now and exp_date <= threshold:
                expiring_soon += 1

        # Usage stats
        usage_stats = await db.execute(
            select(
                func.count(Coupon_usages.id),
                func.coalesce(func.sum(Coupon_usages.discount_amount), 0),
                func.coalesce(func.sum(Coupon_usages.final_amount), 0),
            )
        )
        stats_row = usage_stats.one()
        total_redemptions = stats_row[0] or 0
        total_discount_given = float(stats_row[1] or 0)
        total_revenue_with_coupons = float(stats_row[2] or 0)

        # Average redemption rate
        avg_rate = 0.0
        if total_coupons > 0:
            total_usage = await db.execute(
                select(func.coalesce(func.sum(Coupons.usage_count), 0))
            )
            total_uses = total_usage.scalar() or 0
            max_uses_result = await db.execute(
                select(func.coalesce(func.sum(Coupons.max_uses), 0)).where(Coupons.max_uses.isnot(None))
            )
            max_uses = max_uses_result.scalar() or 0
            if max_uses > 0:
                avg_rate = round((total_uses / max_uses) * 100, 1)

        return AnalyticsSummary(
            total_coupons=total_coupons,
            active_coupons=active_coupons,
            total_redemptions=total_redemptions,
            total_discount_given=total_discount_given,
            total_revenue_with_coupons=total_revenue_with_coupons,
            avg_redemption_rate=avg_rate,
            expiring_soon=expiring_soon,
        )
    except Exception as e:
        logger.error(f"Error fetching analytics summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/usage-over-time", response_model=List[DailyUsageData])
async def get_usage_over_time(
    days: int = Query(30, ge=7, le=90, description="Number of days to look back"),
    db: AsyncSession = Depends(get_db),
):
    """Get daily coupon usage data over time"""
    try:
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=days)

        query = select(
            cast(Coupon_usages.created_at, Date).label("date"),
            func.count(Coupon_usages.id).label("redemptions"),
            func.coalesce(func.sum(Coupon_usages.discount_amount), 0).label("discount_amount"),
            func.coalesce(func.sum(Coupon_usages.final_amount), 0).label("revenue"),
        ).where(
            Coupon_usages.created_at >= start_date
        ).group_by(
            cast(Coupon_usages.created_at, Date)
        ).order_by(
            cast(Coupon_usages.created_at, Date)
        )

        result = await db.execute(query)
        rows = result.all()

        data = []
        for row in rows:
            data.append(DailyUsageData(
                date=str(row.date) if row.date else "",
                redemptions=row.redemptions or 0,
                discount_amount=float(row.discount_amount or 0),
                revenue=float(row.revenue or 0),
            ))

        return data
    except Exception as e:
        logger.error(f"Error fetching usage over time: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/coupon-performance", response_model=List[CouponPerformance])
async def get_coupon_performance(
    db: AsyncSession = Depends(get_db),
):
    """Get performance metrics for each coupon"""
    try:
        # Get all coupons with their usage data
        coupons_result = await db.execute(
            select(Coupons).order_by(Coupons.usage_count.desc().nullslast())
        )
        coupons = coupons_result.scalars().all()

        performances = []
        for c in coupons:
            # Get usage stats for this coupon
            usage_result = await db.execute(
                select(
                    func.count(Coupon_usages.id),
                    func.coalesce(func.sum(Coupon_usages.discount_amount), 0),
                    func.coalesce(func.sum(Coupon_usages.final_amount), 0),
                ).where(Coupon_usages.coupon_id == c.id)
            )
            usage_row = usage_result.one()
            usage_count = usage_row[0] or 0
            total_discount = float(usage_row[1] or 0)
            total_revenue = float(usage_row[2] or 0)

            # Calculate redemption rate
            redemption_rate = 0.0
            if c.max_uses and c.max_uses > 0:
                redemption_rate = round(((c.usage_count or 0) / c.max_uses) * 100, 1)

            avg_discount = round(total_discount / usage_count, 2) if usage_count > 0 else 0

            performances.append(CouponPerformance(
                coupon_id=c.id,
                code=c.code,
                discount_type=c.discount_type or "percentage",
                usage_count=c.usage_count or 0,
                total_discount=total_discount,
                total_revenue=total_revenue,
                redemption_rate=redemption_rate,
                avg_discount=avg_discount,
            ))

        return performances
    except Exception as e:
        logger.error(f"Error fetching coupon performance: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")