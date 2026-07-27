from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String


class Payment_transactions(Base):
    __tablename__ = "payment_transactions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    plan_id = Column(Integer, nullable=True)
    plan_name = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=True)
    status = Column(String, nullable=False)
    payment_method = Column(String, nullable=True)
    payment_gateway = Column(String, nullable=True)
    gateway_payment_id = Column(String, nullable=True)
    billing_cycle = Column(String, nullable=True)
    invoice_number = Column(String, nullable=True)
    description = Column(String, nullable=True)
    failure_reason = Column(String, nullable=True)
    refund_amount = Column(Float, nullable=True)
    is_renewal = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)