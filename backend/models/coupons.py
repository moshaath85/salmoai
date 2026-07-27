from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String


class Coupons(Base):
    __tablename__ = "coupons"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    code = Column(String, nullable=False)
    discount = Column(String, nullable=False)
    discount_type = Column(String, nullable=False)
    coupon_type = Column(String, nullable=True)
    applicable_plans = Column(String, nullable=True)
    applicable_cycles = Column(String, nullable=True)
    usage_count = Column(Integer, nullable=True, default=0)
    max_uses = Column(Integer, nullable=True)
    max_uses_per_user = Column(Integer, nullable=True, default=1)
    min_amount = Column(Float, nullable=True)
    max_discount_amount = Column(Float, nullable=True)
    trial_days = Column(Integer, nullable=True)
    expires_at = Column(String, nullable=True)
    starts_at = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=True, default=True)
    stackable = Column(Boolean, nullable=True, default=False)
    description_ar = Column(String, nullable=True)
    description_en = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)