from src.models.analyze_story import AnalyzeStory
from src.models.analyze_story_result import AnalyzeStoryResult

class AnalyzePersistenceService:

    def __init__(self, db):
        self.db = db

    def save_analysis(
        self,
        parsed_results,
        knowledge_result,
        sprint_id,
        workspace_id,
        creator_id
    ):

        canonical_map = knowledge_result["canonical_map"]

        for parsed in parsed_results:

            # --- 1. Save AnalyzeStory ---
            story = AnalyzeStory(
                as_raw_text = parsed["raw_text"],
                as_status = "DONE",
                as_sprint_id = sprint_id,
                as_workspace_id = workspace_id,
                as_creator_id = creator_id
            )

            self.db.add(story)
            self.db.flush()

            # --- 2. Resolve canonical ---
            subject_can = canonical_map.get(parsed["subject"], parsed["subject"])
            action_can = canonical_map.get(parsed["action"], parsed["action"])
            object_can = canonical_map.get(parsed["object"], parsed["object"])

            # --- 3. Save AnalyzeStoryResult ---
            result = AnalyzeStoryResult(
                asr_story_id = story.as_id,

                asr_subject = parsed["subject"],
                asr_action = parsed["action"],
                asr_object = parsed["object"],

                asr_subject_canonical = subject_can,
                asr_action_canonical = action_can,
                asr_object_canonical = object_can,

                asr_status = parsed["status"],
                asr_creator_id = creator_id
            )

            self.db.add(result)

        self.db.commit()
