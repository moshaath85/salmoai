from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String


class Subscriptions(Base):
    __tablename__ = "subscriptions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    plan_name = Column(String, nullable=False)
    plan_name_en = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    features = Column(String, nullable=True)
    color = Column(String, nullable=True)
    subscribers_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)