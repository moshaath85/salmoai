from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Customers(Base):
    __tablename__ = "customers"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    plan = Column(String, nullable=True)
    status = Column(String, nullable=True)
    payment_status = Column(String, nullable=True)
    registered_at = Column(String, nullable=True)
    last_active = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)