from .base import Base
from sqlalchemy import Column, String, Boolean, DateTime, Integer, func
import uuid
from datetime import datetime

class KnowledgeTerm(Base):
    __tablename__ = "knowledge_terms"

    kt_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    kt_type = Column(String(20), nullable=False, comment="SUBJECT | ACTION | OBJECT")
    kt_canonical = Column(String(100), nullable=False)
    kt_synonyms = Column(String(255))

    kt_workspace_id = Column(String(36), nullable=False)
    kt_status = Column(String(20), default="ACTIVE")

    kt_is_deleted = Column(Boolean, default=False)
    kt_created_at = Column(DateTime, default=func.now())
    kt_updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    kt_version = Column(Integer, default=1)

    kt_creator_id = Column(String(36))
    kt_modifier_id = Column(String(36))
