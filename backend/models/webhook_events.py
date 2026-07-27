from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Webhook_events(Base):
    __tablename__ = "webhook_events"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    gateway_name = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    payload = Column(String, nullable=True)
    status = Column(String, nullable=True)
    retry_count = Column(Integer, nullable=True)
    max_retries = Column(Integer, nullable=True)
    error_message = Column(String, nullable=True)
    signature_valid = Column(Boolean, nullable=True)
    processed_at = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)