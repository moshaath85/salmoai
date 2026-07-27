from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class User_daily_quota(Base):
    __tablename__ = "user_daily_quota"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    quota_date = Column(String, nullable=False)
    question_count = Column(Integer, nullable=False, default=0, server_default='0')
    plan = Column(String, nullable=False, default='unlimited', server_default='unlimited')
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)