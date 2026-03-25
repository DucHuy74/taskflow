from src.services import neo4j_service

class AnalyzeCoordinatorService:

    def __init__(
        self,
        parser_service,
        knowledge_service,
        statistics_service,
        persistence_service,
        neo4j_service=None
    ):
        self.parser = parser_service
        self.knowledge = knowledge_service
        self.statistics = statistics_service
        self.persistence = persistence_service
        self.neo4j = neo4j_service

    def analyze_and_save(self, texts, sprint_id, workspace_id, creator_id):

        parsed_results = []

        # --- Parse ---
        for item in texts:

            text = item["text"]
            story_id = item["user_story_id"]

            parsed = self.parser.parse(text)

            if parsed.get("status") != "ERROR":
                parsed["raw_text"] = text
                parsed["user_story_id"] = story_id
                parsed_results.append(parsed)

        # --- Learning ---
        knowledge_result = self.knowledge.process(parsed_results)
        
        # --- Persist ---
        self.persistence.save_result(
            parsed_results,
            knowledge_result,
            sprint_id,
            workspace_id,
            creator_id
        )

        # --- build SVO list ---
        svo_list = []
        for item in parsed_results:
            s = item.get("subject")
            a = item.get("action")
            o = item.get("object")

            if not s or not a or not o:
                print("Skip invalid SVO:", s, a, o)
                continue

            svo_list.append({
                "subject": s,
                "action": a,
                "object": o,
                "status": "VALID"
            })

        return {
            "knowledge": knowledge_result,
            "svo_list": svo_list
        }
     
     