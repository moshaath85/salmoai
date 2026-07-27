from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String


class Plans(Base):
    __tablename__ = "plans"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name_ar = Column(String, nullable=False)
    name_en = Column(String, nullable=False)
    description_ar = Column(String, nullable=True)
    description_en = Column(String, nullable=True)
    price_monthly = Column(Float, nullable=False)
    price_yearly = Column(Float, nullable=True)
    price_lifetime = Column(Float, nullable=True)
    billing_type = Column(String, nullable=True)
    features = Column(String, nullable=True)
    limits = Column(String, nullable=True)
    trial_days = Column(Integer, nullable=True)
    status = Column(String, nullable=False)
    is_recommended = Column(Boolean, nullable=True)
    sort_order = Column(Integer, nullable=False)
    color = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)