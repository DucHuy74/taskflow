from src.models.analyze_story import AnalyzeStory
from src.models.analyze_story_result import AnalyzeStoryResult


class AnalyzePersistenceService:

    def __init__(self, db):
        self.db = db


    def get_story(self, user_story_id):
        return (
            self.db.query(AnalyzeStory)
            .filter(AnalyzeStory.as_user_story_id == user_story_id)
            .first()
        )

    def get_pending_stories(self):

        return (
            self.db.query(AnalyzeStory)
            .filter(AnalyzeStory.as_status == "RECEIVED")
            .all()
        )

    def save_parse_result(
        self,
        story,
        parsed,
        canonical_map
    ):

        subject_can = canonical_map.get(parsed["subject"], parsed["subject"])
        action_can = canonical_map.get(parsed["action"], parsed["action"])
        object_can = canonical_map.get(parsed["object"], parsed["object"])

        result = AnalyzeStoryResult(
            asr_story_id = story.as_id,

            asr_subject = parsed["subject"],
            asr_action = parsed["action"],
            asr_object = parsed["object"],

            asr_subject_canonical = subject_can,
            asr_action_canonical = action_can,
            asr_object_canonical = object_can,

            asr_status = parsed["status"]
        )

        self.db.add(result)

        story.as_status = "DONE"

        self.db.commit()