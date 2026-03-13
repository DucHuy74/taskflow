from .base import Base
from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, Text, func
import uuid
from datetime import datetime

class AnalyzeStory(Base):
    __tablename__ = "analyze_stories"

    as_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    as_user_story_id = Column(String(36), nullable=True)
    as_sprint_id = Column(String(36), nullable=True)
    as_workspace_id = Column(String(36), nullable=True)
    as_backlog_id = Column(String(36), nullable=True)

    
    as_raw_text = Column(Text, nullable=False)

    as_status = Column(String(20), nullable=False, comment="RECEIVED | PARSED | FAILED | DONE")

    as_is_deleted = Column(Boolean, default=False)
    as_created_at = Column(DateTime, default=func.now())
    as_updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
