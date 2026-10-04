from .base_repository import BaseRepository
from src.models.analyze_story_result import AnalyzeStoryResult

class AnalyzeStoryRepository(BaseRepository):

    def get_by_story_and_sprint(self, session, story_id, sprint_id):
        return session.query(AnalyzeStoryResult).filter(
            AnalyzeStoryResult.asr_user_story_id == story_id,
            AnalyzeStoryResult.asr_sprint_id == sprint_id,
            AnalyzeStoryResult.asr_is_deleted == False
        ).first()
