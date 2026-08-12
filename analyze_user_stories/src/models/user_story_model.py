from sqlalchemy import Column, String, Text
from src.models.base import Base

class UserStory(Base):
    __tablename__ = "user_story"

    id = Column("us_id", String, primary_key=True)
    story_text = Column("us_story_text", Text)
    status = Column("us_status", String)

    sprint_id = Column("spr_id", String)
    workspace_id = Column("wsp_id", String)
    backlog_id = Column("backlog_id", String)