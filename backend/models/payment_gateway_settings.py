from core.database import Base
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Payment_gateway_settings(Base):
    __tablename__ = "payment_gateway_settings"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    gateway_name = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    api_key_encrypted = Column(String, nullable=True)
    secret_key_encrypted = Column(String, nullable=True)
    public_key_encrypted = Column(String, nullable=True)
    webhook_secret_encrypted = Column(String, nullable=True)
    merchant_id = Column(String, nullable=True)
    environment = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=True)
    is_default = Column(Boolean, nullable=True)
    supported_currencies = Column(String, nullable=True)
    supported_countries = Column(String, nullable=True)
    payment_methods = Column(String, nullable=True)
    sort_order = Column(Integer, nullable=True)
    last_test_at = Column(String, nullable=True)
    last_test_status = Column(String, nullable=True)
    last_successful_payment_at = Column(String, nullable=True)
    connection_status = Column(String, nullable=True)
    settings_json = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)