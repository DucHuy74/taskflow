from src.models.analyze_story_result import AnalyzeStoryResult


class GraphBatchService:

    def __init__(self, semantic_service, statistics_service, neo4j_service, db):
        self.semantic_service = semantic_service
        self.statistics_service = statistics_service
        self.neo4j_service = neo4j_service
        self.db = db

    def rebuild_workspace(self, workspace_id):

        print(f"\n[BATCH] Rebuilding workspace: {workspace_id}")

        # load all SVO for workspace
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

        print(f"[BATCH] Total SVO: {len(all_svo)}")

        # validate data
        if len(all_svo) < 3:
            print("[BATCH] Not enough data: skip rebuild")
            return

        try:
            # build knowledge (canonical + auto-merge)
            knowledge = self.semantic_service.process(all_svo)

            canonical_map = knowledge["canonical_map"]
            valid_svo = knowledge["valid_svo"]
            auto_merge = knowledge["auto_merge"]

            print(f"[BATCH] Canonical size: {len(canonical_map)}")

            # build association rules
            transactions, rules = self.statistics_service.generate_association_rules(
                all_svo,
                canonical_map
            )

            print(f"[BATCH] Rules count: {len(rules)}")

            # clear after build xong để tránh mất dữ liệu nếu có lỗi ở phần neo4j
            print("[BATCH] Clearing old graph...")
            self.neo4j_service.clear_workspace(workspace_id)

            # rebuild graph
            print("[BATCH] Saving SVO...")
            self.neo4j_service.save_svo(valid_svo, canonical_map, workspace_id, source="BATCH")

            print("[BATCH] Saving similarity...")
            self.neo4j_service.save_similarity(auto_merge, canonical_map, workspace_id)

            print("[BATCH] Saving rules...")
            self.neo4j_service.save_rules(rules, canonical_map, workspace_id)

            print(f"[BATCH] DONE workspace: {workspace_id}")

        except Exception as e:
            print(f"[BATCH] FAILED workspace {workspace_id}: {e}")
            raise e