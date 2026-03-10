# from .base import Base
# from sqlalchemy import Column, ForeignKey, Integer, String
# import uuid

# class Workspace(Base):
#     __tablename__ = "workspaces"

#     id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
#     name = Column(String(100), nullable=False)
#     description = Column(String(255), nullable=True)
#     owner_id = Column(String(36), ForeignKey('users.id'), nullable=False)
#     created_at = Column(String(50), nullable=False, default='now()')
#     updated_at = Column(String(50), nullable=False, default='now()')