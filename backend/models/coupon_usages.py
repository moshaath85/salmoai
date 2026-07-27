from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String


class Coupon_usages(Base):
    __tablename__ = "coupon_usages"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    coupon_id = Column(Integer, nullable=False)
    coupon_code = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    plan_id = Column(Integer, nullable=True)
    billing_cycle = Column(String, nullable=True)
    original_amount = Column(Float, nullable=False)
    discount_amount = Column(Float, nullable=False)
    final_amount = Column(Float, nullable=False)
    applied_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)