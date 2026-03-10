# from .base import Base
# from sqlalchemy import Boolean, Column, String, ForeignKey
# import uuid

# class Domain(Base): 
#     __tablename__ = 'domains'

#     id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
#     domain = Column(String(100), nullable=False)

#     created_at = Column(String(50), nullable=False, default='now()')
#     updated_at = Column(String(50), nullable=False, default='now()')

