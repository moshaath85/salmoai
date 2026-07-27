from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Clients(Base):
    __tablename__ = "clients"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    company_name = Column(String, nullable=False)
    owner_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    mobile = Column(String, nullable=False)
    status = Column(String, nullable=True, default='pending_payment', server_default='pending_payment')
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)