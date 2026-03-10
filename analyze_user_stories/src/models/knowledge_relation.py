from .base import Base
from sqlalchemy import Column, String, Float, Boolean, DateTime, Integer, ForeignKey, func
import uuid
from datetime import datetime

class KnowledgeRelation(Base):
    __tablename__ = "knowledge_relations"

    kr_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    kr_from_term_id = Column(String(36), ForeignKey("knowledge_terms.kt_id"), nullable=False)
    kr_to_term_id = Column(String(36), ForeignKey("knowledge_terms.kt_id"), nullable=False)

    kr_relation = Column(String(50), nullable=False)
    kr_support = Column(Float)
    kr_confidence = Column(Float)

    kr_workspace_id = Column(String(36), nullable=False)

    kr_is_deleted = Column(Boolean, default=False)
    kr_created_at = Column(DateTime, default=func.now())
    kr_updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    kr_version = Column(Integer, default=1)

    kr_creator_id = Column(String(36))
    kr_modifier_id = Column(String(36))
