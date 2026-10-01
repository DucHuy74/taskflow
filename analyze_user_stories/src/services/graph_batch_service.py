from src.services.priority_service import PriorityService
from src.models.analyze_story_result import AnalyzeStoryResult
from src.services.redundancy_classification_service import RedundancyClassificationService
from constant import (
    REDUNDANCY_THRESHOLD,
    PRIORITY_W_INITIAL,
    PRIORITY_W_SIMILARITY,
    PRIORITY_W_RULE,
    PRIORITY_REDUNDANCY_ALPHA,
    REDUNDANCY_GRAPH_TOP_K,
    REDUNDANCY_GRAPH_MIN_SCORE,
)
from src.utils import sorted_term_pair


class GraphBatchService:

    def __init__(self, semantic_service, statistics_service, neo4j_service, db):
        self.semantic_service = semantic_service
        self.statistics_service = statistics_service
        self.neo4j_service = neo4j_service
        self.db = db
        
        self.priority_service = PriorityService(
            neo4j_service=neo4j_service,
            db=db
        )
        self.redundancy_service = RedundancyClassificationService(
            threshold=REDUNDANCY_THRESHOLD
        )

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
                "story_id": r.asr_user_story_id,
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
            
            print("[BATCH] Computing priority...")
            self.priority_service.compute_priority_for_workspace(workspace_id)

            print("[BATCH] Building classification dataset...")
            stories = self.redundancy_service.build_story_schema(rows)
            print(f"[BATCH] Stories for classification: {len(stories)}")

            similarity_rows = self.neo4j_service.load_similarity_map(workspace_id)
            similarity_map = {}
            for item in similarity_rows:
                left_term = item.get("left_term")
                right_term = item.get("right_term")
                if not left_term or not right_term:
                    continue
                pair_key = sorted_term_pair(left_term, right_term)
                similarity_map[pair_key] = max(similarity_map.get(pair_key, 0.0), float(item["score"]))

            rule_rows = self.neo4j_service.load_rule_map(workspace_id)
            rule_map = {}
            for item in rule_rows:
                left_term = item.get("left_term")
                right_term = item.get("right_term")
                if not left_term or not right_term:
                    continue
                pair_key = sorted_term_pair(left_term, right_term)
                current = rule_map.get(pair_key, {"confidence": 0.0, "lift": 0.0})
                current["confidence"] = max(current["confidence"], float(item["confidence"]))
                current["lift"] = max(current["lift"], float(item["lift"]))
                rule_map[pair_key] = current

            priority_rows = self.neo4j_service.load_story_priorities(workspace_id)
            priority_map = {
                item["story_id"]: float(item["priority"])
                for item in priority_rows
                if item.get("story_id")
            }

            pair_df = self.redundancy_service.build_pair_dataset(
                stories=stories,
                similarity_map=similarity_map,
                rule_map=rule_map,
                priority_map=priority_map,
            )

            pair_df = self.redundancy_service.build_weak_labels(pair_df)
            labeled_df = pair_df[pair_df["weak_label"] >= 0].copy()

            print(f"[BATCH] Pair count={len(pair_df)} labeled={len(labeled_df)}")
            model, model_result = self.redundancy_service.train_baseline_models(labeled_df)
            model_name = model_result.get("best_model", "rule_fallback")
            metrics = model_result.get("metrics", {"note": model_result.get("reason", "not_available")})

            scored_pairs = self.redundancy_service.predict_redundancy(model, pair_df)
            if not scored_pairs.empty:
                scored_pairs = scored_pairs.copy()
                scored_pairs["redundancy_prob"] = (
                    scored_pairs["redundancy_prob"].fillna(0.0).clip(0.0, 1.0)
                )

            group_map = self.redundancy_service.build_groups(scored_pairs, stories)
            redundancy_score_map = self.redundancy_service.aggregate_story_scores(scored_pairs, stories)

            if scored_pairs.empty:
                export_pairs = scored_pairs
            else:
                ranked = scored_pairs.sort_values("redundancy_prob", ascending=False)
                if REDUNDANCY_GRAPH_MIN_SCORE > 0:
                    ranked = ranked[ranked["redundancy_prob"] >= REDUNDANCY_GRAPH_MIN_SCORE]
                export_pairs = ranked.head(REDUNDANCY_GRAPH_TOP_K)
                if export_pairs.empty:
                    export_pairs = scored_pairs.sort_values(
                        "redundancy_prob", ascending=False
                    ).head(REDUNDANCY_GRAPH_TOP_K)

            max_prob = (
                float(export_pairs["redundancy_prob"].max())
                if not export_pairs.empty
                else 0.0
            )
            print(f"[BATCH] Redundancy export candidates: {len(export_pairs)} max_prob={max_prob:.4f}")

            self.neo4j_service.clear_redundancy_pairs(workspace_id)

            pair_outputs = []
            for _, row in export_pairs.iterrows():
                left_id = row.get("left_story_id")
                right_id = row.get("right_story_id")
                if not left_id or not right_id:
                    continue
                pair_outputs.append(
                    {
                        "left_story_id": str(left_id),
                        "right_story_id": str(right_id),
                        "redundancy_prob": float(row["redundancy_prob"]),
                        "group_id": group_map.get(left_id, "group_0"),
                        "model_name": model_name,
                        "is_redundant": bool(row["is_redundant"]),
                    }
                )

            story_outputs = []
            for story in stories:
                priority_initial = priority_map.get(story.story_id, 0.0)
                object_signal = max(
                    similarity_map.get(sorted_term_pair(story.object_name, other.object_name), 0.0)
                    for other in stories
                )
                action_signal = max(
                    similarity_map.get(sorted_term_pair(story.action, other.action), 0.0)
                    for other in stories
                )
                rule_signal = max(
                    rule_map.get(sorted_term_pair(story.object_name, other.object_name), {}).get("confidence", 0.0)
                    for other in stories
                )
                similarity_signal = 0.5 * object_signal + 0.5 * action_signal

                priority_refined = (
                    PRIORITY_W_INITIAL * priority_initial
                    + PRIORITY_W_SIMILARITY * similarity_signal
                    + PRIORITY_W_RULE * rule_signal
                )

                redundancy_prob = redundancy_score_map.get(story.story_id, 0.0)
                priority_final = priority_refined * (1 - PRIORITY_REDUNDANCY_ALPHA * redundancy_prob)

                story_outputs.append(
                    {
                        "story_id": story.story_id,
                        "priority_refined": float(min(max(priority_refined, 0.0), 1.0)),
                        "redundancy_prob": float(min(max(redundancy_prob, 0.0), 1.0)),
                        "priority_final": float(min(max(priority_final, 0.0), 1.0)),
                        "redundancy_group_id": group_map.get(story.story_id, "group_0"),
                    }
                )

            self.neo4j_service.save_story_priority_v2(workspace_id, story_outputs)
            self.neo4j_service.save_redundancy_pairs(workspace_id, pair_outputs)
            self.neo4j_service.save_classification_metrics(workspace_id, model_name, metrics)
            redundant_edges = self.neo4j_service.count_redundancy_pairs(workspace_id)
            redundant_count = int(scored_pairs["is_redundant"].sum()) if not scored_pairs.empty else 0
            print(
                f"[BATCH] Classification model={model_name} "
                f"pairs_exported={len(pair_outputs)} "
                f"redundant_edges_in_db={redundant_edges} "
                f"redundant_above_threshold={redundant_count}"
            )

            print(f"[BATCH] DONE workspace: {workspace_id}")

        except Exception as e:
            print(f"[BATCH] FAILED workspace {workspace_id}: {e}")
            raise e