from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Gateway_audit_logs(Base):
    __tablename__ = "gateway_audit_logs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    gateway_name = Column(String, nullable=False)
    action = Column(String, nullable=False)
    details = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    connection_status_before = Column(String, nullable=True)
    connection_status_after = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)