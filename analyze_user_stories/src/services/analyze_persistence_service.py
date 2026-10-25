from src.models.analyze_story_result import AnalyzeStoryResult


class AnalyzePersistenceService:

    def __init__(self, db):
        self.db = db

    def save_result(
        self,
        parsed_results,
        knowledge_result,
        sprint_id,
        workspace_id,
        creator_id,
        backlog_id=None,
    ):

        canonical_map = knowledge_result["canonical_map"]

        for parsed in parsed_results:

            subject_can = canonical_map.get(parsed["subject"], parsed["subject"])
            action_can = canonical_map.get(parsed["action"], parsed["action"])
            object_can = canonical_map.get(parsed["object"], parsed["object"])

            result = AnalyzeStoryResult(
                asr_user_story_id=parsed["user_story_id"],
                asr_workspace_id=workspace_id,
                asr_sprint_id=sprint_id,
                asr_backlog_id=backlog_id,

                asr_subject=parsed["subject"],
                asr_action=parsed["action"],
                asr_object=parsed["object"],

                asr_subject_canonical=subject_can,
                asr_action_canonical=action_can,
                asr_object_canonical=object_can,

                asr_status=parsed["status"],
                asr_parse_method=parsed.get("parse_method"),
                asr_confidence=parsed.get("confidence"),
            )

            self.db.add(result)

        self.db.commit()
        
    def is_processed(self, user_story_id):
        return self.db.query(AnalyzeStoryResult).filter(
            AnalyzeStoryResult.asr_user_story_id == user_story_id,
            AnalyzeStoryResult.asr_is_deleted == False
        ).first()
        
    def update_context(self, story_id, sprint_id, backlog_id):
        """Sync sprint/backlog on EVERY analyze_story_results row of the story (one story can have several SVO rows)."""
        updated = (
            self.db.query(AnalyzeStoryResult)
            .filter(AnalyzeStoryResult.asr_user_story_id == story_id)
            .update(
                {
                    AnalyzeStoryResult.asr_sprint_id: sprint_id,
                    AnalyzeStoryResult.asr_backlog_id: backlog_id,
                },
                synchronize_session=False,
            )
        )
        self.db.commit()
        return updated
