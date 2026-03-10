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
