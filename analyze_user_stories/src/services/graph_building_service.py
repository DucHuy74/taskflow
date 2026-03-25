from src.models.analyze_story_result import AnalyzeStoryResult

class GraphBuildingService:

    def __init__(self, semantic_service, statistics_service, neo4j_service, db):
        self.semantic_service = semantic_service
        self.statistics_service = statistics_service
        self.neo4j_service = neo4j_service
        self.db = db 

    def process(self, svo_list, workspace_id):

        if not svo_list:
            return

       
        #LOAD ALL SVO
        rows = (
            self.db.query(AnalyzeStoryResult)
            .filter(
                AnalyzeStoryResult.asr_workspace_id == workspace_id,
                AnalyzeStoryResult.asr_is_deleted == False
            )
            .all()
        )

        all_svo = []

        for r in rows:
            if not r.asr_subject or not r.asr_action or not r.asr_object:
                continue

            all_svo.append({
                "subject": r.asr_subject,
                "action": r.asr_action,
                "object": r.asr_object,
                "status": "VALID"
            })

        if len(all_svo) < 2:
            print("Skip similarity - not enough data")
            return

       
        #similarity 
        knowledge_result = self.semantic_service.process(all_svo)

        canonical_map = knowledge_result["canonical_map"]
        valid_svo = knowledge_result["valid_svo"]
        auto_merge = knowledge_result["auto_merge"]

        print("\n===== CANONICAL MAP =====")
        for k, v in canonical_map.items():
            print(f"{k} -> {v}")

        print("\n===== AUTO MERGE =====")
        for item in auto_merge:
            print(item)

       
        # association rules chỉ nên chạy khi có đủ data, tránh trường hợp rules toàn dạng {term} -> {term} do canonical map quá nhiều
       
        if len(all_svo) < 3:
            print("Skip rules - not enough data")
            rules = []
        else:
            transactions, rules = self.statistics_service.generate_association_rules(
                all_svo,
                canonical_map
            )

        print("\n===== RULES =====")
        for r in rules:
            print(r)

        
        #  3. save Neo4j
        self.neo4j_service.save_svo(valid_svo, canonical_map, workspace_id)

        self.neo4j_service.save_similarity(
            auto_merge,
            canonical_map,
            workspace_id
        )

        self.neo4j_service.save_rules(rules,canonical_map, workspace_id)