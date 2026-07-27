from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String


class User_subscriptions(Base):
    __tablename__ = "user_subscriptions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    plan_id = Column(Integer, nullable=False)
    status = Column(String, nullable=False)
    billing_cycle = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    auto_renew = Column(Boolean, nullable=True)
    payment_method = Column(String, nullable=True)
    amount_paid = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)