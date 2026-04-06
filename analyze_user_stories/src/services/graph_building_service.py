from src.models.analyze_story_result import AnalyzeStoryResult

class GraphBuildingService:

    def __init__(self, semantic_service, neo4j_service):
        self.semantic_service = semantic_service
        self.neo4j_service = neo4j_service

    def process_realtime(
        self,
        svo_list,
        workspace_id,
        story_id,
        sprint_id=None,
        backlog_id=None
    ):

        if not svo_list:
            return

        # normalize nhẹ
        knowledge = self.semantic_service.process(svo_list)

        canonical_map = knowledge["canonical_map"]
        valid_svo = knowledge["valid_svo"]


        self.neo4j_service.save_svo(
            valid_svo,
            canonical_map,
            workspace_id,
            story_id,
            sprint_id,
            backlog_id
        )