from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String


class Packages(Base):
    __tablename__ = "packages"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    billing_cycle = Column(String, nullable=False)
    max_users = Column(Integer, nullable=False)
    features = Column(String, nullable=True)
    status = Column(String, nullable=True, default='active', server_default='active')
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)