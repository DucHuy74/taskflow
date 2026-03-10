from .base_repository import BaseRepository
from models.analyze_story import AnalyzeStory

class AnalyzeStoryRepository(BaseRepository):

    def get_by_story_and_sprint(self, session, story_id, sprint_id):
        return session.query(AnalyzeStory).filter(
            AnalyzeStory.as_user_story_id == story_id,
            AnalyzeStory.as_sprint_id == sprint_id,
            AnalyzeStory.as_is_deleted == False
        ).first()
