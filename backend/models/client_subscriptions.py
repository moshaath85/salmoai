from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Client_subscriptions(Base):
    __tablename__ = "client_subscriptions"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    client_id = Column(Integer, nullable=False)
    package_id = Column(Integer, nullable=False)
    status = Column(String, nullable=True)
    payment_status = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)