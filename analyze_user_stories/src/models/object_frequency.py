# from .base import Base
# from sqlalchemy import Column, Float, ForeignKey, String, Integer
# import uuid

# class ObjectFrequency(Base): 
#     __tablename__ = 'object_frequencies'

#     id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

#     text_object = Column(String(36), nullable=False)
#     workspace_id = Column(String(36), ForeignKey('workspaces.id'), nullable=False)
#     frequency = Column(Float, nullable=False, comment="Tần suất sẽ từ 0 đến 100 và là tần suất so với workspace này")
    

#     created_at = Column(String(50), nullable=False, default='now()')
#     updated_at = Column(String(50), nullable=False, default='now()')

# # có 2 hướng để triển khai ranking đó là object nào xuất hiện nhiều thì nó quan trọng hơn 
# # và xếp hạng từ 1 tức quan trọng nhất hoặc sẽ ranking khi mà query
# # còn nếu xếp hạng luôn thì sẽ gặp 1 vấn đề mỗi lần có 1 list user story mới thì sẽ đều phải tỉnh toán lại cho toàn bộ workspace
# # tạm thời sẽ không triển khai ranking và vấn đề này sẽ cân nhắc tùy thuộc về hệ thống sau này như nào

