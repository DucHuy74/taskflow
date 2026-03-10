# from .base import Base
# from sqlalchemy import Column, Integer, String
# import uuid

# class User(Base): 
#     __tablename__ = 'users'

#     id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
#     username = Column(String(50), unique=True, nullable=False)
#     email = Column(String(100), unique=True, nullable=False)
#     password = Column(String(100), nullable=False)

#     created_at = Column(String(50), nullable=False, default='now()')
#     updated_at = Column(String(50), nullable=False, default='now()')

