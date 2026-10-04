import uuid

from sqlalchemy import Column, DateTime, LargeBinary, String, UniqueConstraint, func

from .base import Base


class StoryEmbedding(Base):
    __tablename__ = "story_embeddings"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id", "story_id", "content_fingerprint", "model_version",
            name="uq_story_embedding_revision",
        ),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id = Column(String(36), nullable=False, index=True)
    story_id = Column(String(36), nullable=False, index=True)
    content_fingerprint = Column(String(64), nullable=False)
    model_version = Column(String(100), nullable=False)
    vector = Column(LargeBinary, nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
