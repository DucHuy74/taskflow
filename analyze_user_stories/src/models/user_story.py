# from .base import Base
# from sqlalchemy import Boolean, Column, String, ForeignKey
# import uuid

# class UserStory(Base): 
#     __tablename__ = 'user_stories'

#     id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

#     text = Column(String(100), nullable=False)
#     subject = Column(String(100), nullable=False)
#     verb = Column(String(100), nullable=False)
#     object = Column(String(100), nullable=False)

#     workspace_id = Column(String(36), ForeignKey('workspaces.id'), nullable=False)
#     user_id = Column(String(36), ForeignKey('users.id'), nullable=False)
#     verb_id = Column(String(36), ForeignKey("verbs.id"))
#     object_id = Column(String(36), ForeignKey("objects.id"))


#     is_error = Column(Boolean, nullable=False, default=False, comment="Đánh dấu user story lỗi")

#     created_at = Column(String(50), nullable=False, default='now()')
#     updated_at = Column(String(50), nullable=False, default='now()')

