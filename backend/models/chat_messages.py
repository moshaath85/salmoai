from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Chat_messages(Base):
    __tablename__ = "chat_messages"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    role = Column(String, nullable=False)
    content = Column(String, nullable=False)
    session_id = Column(String, nullable=True, default='default', server_default='default')
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)