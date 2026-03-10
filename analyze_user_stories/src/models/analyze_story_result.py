from .base import Base
from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, ForeignKey, func
import uuid
from datetime import datetime

class AnalyzeStoryResult(Base):
    __tablename__ = "analyze_story_results"

    asr_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    asr_story_id = Column(String(36), ForeignKey("analyze_stories.as_id"), nullable=True)

    asr_subject = Column(String(100))
    asr_action = Column(String(100))
    asr_object = Column(String(100))

    asr_subject_canonical = Column(String(100))
    asr_action_canonical = Column(String(100))
    asr_object_canonical = Column(String(100))

    asr_status = Column(String(20), comment="VALID | AMBIGUOUS | ERROR")

    asr_is_deleted = Column(Boolean, default=False)
    asr_created_at = Column(DateTime, default=func.now())
    asr_updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    asr_version = Column(Integer, default=1)

    asr_creator_id = Column(String(36))
    asr_modifier_id = Column(String(36))
