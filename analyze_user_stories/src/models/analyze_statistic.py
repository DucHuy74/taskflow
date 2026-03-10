from .base import Base
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, func
import uuid
from datetime import datetime

class AnalyzeStatistic(Base):
    __tablename__ = "analyze_statistics"

    ast_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    ast_term_id = Column(String(36), ForeignKey("knowledge_terms.kt_id"), nullable=False)
    ast_sprint_id = Column(String(36), nullable=False)

    ast_frequency = Column(Integer, nullable=False)

    ast_created_at = Column(DateTime, default=func.now())
    ast_updated_at = Column(DateTime, default=func.now(), onupdate=func.now())