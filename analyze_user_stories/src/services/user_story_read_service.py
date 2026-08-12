from src.models.user_story_model import UserStory

class UserStoryReadService:

    def __init__(self, db):
        self.db = db

    def get_story_by_id(self, story_id):
        return (
            self.db.query(UserStory)
            .filter(UserStory.id == story_id)
            .first()
        )