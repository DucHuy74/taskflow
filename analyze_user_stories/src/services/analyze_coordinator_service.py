class AnalyzeCoordinatorService:

    def __init__(
        self,
        parser_service,
        knowledge_service,
        statistics_service,
        persistence_service
    ):
        self.parser = parser_service
        self.knowledge = knowledge_service
        self.statistics = statistics_service
        self.persistence = persistence_service

    def analyze_and_save(self, texts, sprint_id, workspace_id, creator_id):

        parsed_results = []

        # --- Parse ---
        for text in texts:
            parsed = self.parser.parse(text)

            if parsed.get("status") != "ERROR":
                parsed["raw_text"] = text
                parsed_results.append(parsed)

        # --- Learning ---
        knowledge_result = self.knowledge.process(parsed_results)
        canonical_map = knowledge_result["canonical_map"]
        valid_svo = knowledge_result["valid_svo"]
        
        transactions, rules = self.statistics.generate_association_rules(
            valid_svo,
            canonical_map
        )

        
        # --- Persist ---
        self.persistence.save_analysis(
            parsed_results,
            knowledge_result,
            sprint_id,
            workspace_id,
            creator_id
        )

        return {
            "knowledge": knowledge_result,
            "rules": rules,
            "transactions": transactions
        }
     
     
    def parse_and_save(self, story_id):

        story = self.persistence.get_story(story_id)

        if story is None:
            return {
                "error": "Story not found",
                "story_id": story_id
            }
        
        parsed = self.parser.parse(story.as_raw_text)

        if parsed.get("status") == "ERROR":
            return {"status": "ERROR"}

        knowledge_result = self.knowledge.process([parsed])
        canonical_map = knowledge_result["canonical_map"]

        self.persistence.save_parse_result(
            story,
            parsed,
            canonical_map
        )

        return parsed   
    
    
    def parse_pending_stories(self):

        stories = self.persistence.get_pending_stories()

        parsed_ids = []

        for story in stories:

            parsed = self.parser.parse(story.as_raw_text)

            if parsed.get("status") == "ERROR":
                continue

            canonical_map = {}

            self.persistence.save_parse_result(
                story,
                parsed,
                canonical_map
            )

            parsed_ids.append(story.as_user_story_id)

        return parsed_ids