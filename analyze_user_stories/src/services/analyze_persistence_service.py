from src.models.analyze_story_result import AnalyzeStoryResult


class AnalyzePersistenceService:

    def __init__(self, db):
        self.db = db

    def save_result(self, parsed_results, knowledge_result, sprint_id, workspace_id, creator_id):

        canonical_map = knowledge_result["canonical_map"]

        for parsed in parsed_results:

            subject_can = canonical_map.get(parsed["subject"], parsed["subject"])
            action_can = canonical_map.get(parsed["action"], parsed["action"])
            object_can = canonical_map.get(parsed["object"], parsed["object"])

            result = AnalyzeStoryResult(
                asr_user_story_id=parsed["user_story_id"],
                asr_workspace_id=workspace_id,
                asr_sprint_id=sprint_id,

                asr_subject=parsed["subject"],
                asr_action=parsed["action"],
                asr_object=parsed["object"],

                asr_subject_canonical=subject_can,
                asr_action_canonical=action_can,
                asr_object_canonical=object_can,

                asr_status=parsed["status"]
            )

            self.db.add(result)

        self.db.commit()
        
    def is_processed(self, user_story_id):
        return self.db.query(AnalyzeStoryResult).filter(
            AnalyzeStoryResult.asr_user_story_id == user_story_id,
            AnalyzeStoryResult.asr_is_deleted == False
        ).first()
        
    def update_context(self, story_id, sprint_id, backlog_id):
        result = self.db.query(AnalyzeStoryResult)\
            .filter_by(asr_user_story_id=story_id)\
            .first()

        if result:
            result.asr_sprint_id = sprint_id
            result.asr_backlog_id = backlog_id
            self.db.commit()