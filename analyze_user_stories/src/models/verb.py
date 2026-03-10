# from .base import Base
# from sqlalchemy import Boolean, Column, String, ForeignKey
# import uuid

# class Verb(Base): 
#     __tablename__ = 'verbs'

#     id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
#     canonical = Column(String(50), unique=True, comment="Động từ sau khi được chuẩn hóa đưa về 1 từ duy nhất từ những từ synonyms column")  
#     synonyms = Column(String(50), comment="Danh sách các từ có độ tương đồng cao")  # JSON list: ["add", "insert"]

#     created_at = Column(String(50), nullable=False, default='now()')
#     updated_at = Column(String(50), nullable=False, default='now()')

