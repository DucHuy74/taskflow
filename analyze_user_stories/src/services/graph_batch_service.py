from src.services.priority_service import PriorityService
from src.models.analyze_story_result import AnalyzeStoryResult
from src.models.user_story_model import UserStory
from src.services.redundancy_classification_service import RedundancyClassificationService
from src.services.story_embedding_service import StoryEmbeddingService
from constant import (
    REDUNDANCY_THRESHOLD,
    PRIORITY_W_INITIAL,
    PRIORITY_W_SIMILARITY,
    PRIORITY_W_RULE,
    REDUNDANCY_GRAPH_TOP_K,
    REDUNDANCY_GRAPH_MIN_SCORE,
    RECOMMENDATION_EMBEDDINGS_ENABLED,
    RECOMMENDATION_MODEL_VERSION,
    RECOMMENDATION_POLICY_VERSION,
    RECOMMENDATION_TOP_K,
)
from src.utils import sorted_term_pair


class GraphBatchService:

    def __init__(self, semantic_service, statistics_service, neo4j_service, db, source_db):
        self.semantic_service = semantic_service
        self.statistics_service = statistics_service
        self.neo4j_service = neo4j_service
        self.db = db
        self.source_db = source_db
        
        self.priority_service = PriorityService(
            neo4j_service=neo4j_service,
            db=db
        )
        self.redundancy_service = RedundancyClassificationService(
            threshold=REDUNDANCY_THRESHOLD
        )

    def _load_story_text_by_id(self, rows):
        story_ids = list({row.asr_user_story_id for row in rows if row.asr_user_story_id})
        if not story_ids:
            return {}

        stories = (
            self.source_db.query(UserStory)
            .filter(UserStory.id.in_(story_ids))
            .all()
        )
        return {story.id: story.story_text for story in stories}

    def rebuild_workspace(self, workspace_id, source_revision=None, progress_callback=None):

        def report(stage, progress):
            if progress_callback:
                progress_callback(stage, progress)

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
            print("[BATCH] Not enough data: complete with no candidates")
            return {
                "status": "SUCCEEDED",
                "candidate_count": 0,
                "candidates": [],
                "model_version": RECOMMENDATION_MODEL_VERSION,
                "policy_version": RECOMMENDATION_POLICY_VERSION,
            }

        try:
            report("LOADING", 15)
            # build knowledge (canonical + auto-merge)
            knowledge = self.semantic_service.process(all_svo)

            canonical_map = knowledge["canonical_map"]
            valid_svo = knowledge["valid_svo"]
            similarity_results = knowledge["similarity_results"]

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
            self.neo4j_service.save_similarity(similarity_results, canonical_map, workspace_id)

            print("[BATCH] Saving rules...")
            self.neo4j_service.save_rules(rules, canonical_map, workspace_id)
            
            print("[BATCH] Computing priority...")
            self.priority_service.compute_priority_for_workspace(workspace_id)

            print("[BATCH] Building classification dataset...")
            story_text_by_id = self._load_story_text_by_id(rows)
            stories = self.redundancy_service.build_story_schema(rows, story_text_by_id)
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

            text_similarity_map = {}
            if RECOMMENDATION_EMBEDDINGS_ENABLED:
                report("EMBEDDING", 35)
                embedding_service = StoryEmbeddingService(self.db)
                embeddings = embedding_service.embeddings(workspace_id, stories)
                report("RETRIEVING", 50)
                text_similarity_map = embedding_service.nearest_pairs(embeddings, RECOMMENDATION_TOP_K)

            pair_df = self.redundancy_service.build_pair_dataset(
                stories=stories,
                similarity_map=similarity_map,
                rule_map=rule_map,
                priority_map=priority_map,
                text_similarity_map=text_similarity_map,
            )

            report("SCORING", 65)
            print(f"[BATCH] Pair count={len(pair_df)}")
            model_name = RECOMMENDATION_MODEL_VERSION
            metrics = {"note": "deterministic_ranker", "policy_version": RECOMMENDATION_POLICY_VERSION}
            scored_pairs = self.redundancy_service.predict_redundancy(None, pair_df)
            if not scored_pairs.empty:
                scored_pairs = scored_pairs.copy()
                scored_pairs["redundancy_prob"] = (
                    scored_pairs["redundancy_prob"].fillna(0.0).clip(0.0, 1.0)
                )

            group_map = self.redundancy_service.build_groups(scored_pairs, stories)
            redundancy_score_map = self.redundancy_service.aggregate_story_scores(scored_pairs, stories)
            story_by_id = {story.story_id: story for story in stories}

            if scored_pairs.empty:
                export_pairs = scored_pairs
            else:
                ranked = scored_pairs.sort_values("redundancy_prob", ascending=False)
                minimum_score = max(self.redundancy_service.threshold, REDUNDANCY_GRAPH_MIN_SCORE)
                ranked = ranked[ranked["redundancy_prob"] >= minimum_score]
                export_pairs = ranked.head(REDUNDANCY_GRAPH_TOP_K)

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
                if str(left_id) > str(right_id):
                    left_id, right_id = right_id, left_id
                left_story = story_by_id[left_id]
                right_story = story_by_id[right_id]
                representative = max(
                    (left_story, right_story),
                    key=lambda item: (item.parse_confidence, priority_map.get(item.story_id, 0.0), item.story_id),
                )
                evidence_values = {
                    "SAME_CANONICAL_ACTION": float(row["same_action"]),
                    "SAME_CANONICAL_OBJECT": float(row["same_object"]),
                    "SEMANTIC_TEXT_SIMILARITY": float(row["semantic_text_similarity"]),
                    "SUBJECT_COMPATIBILITY": float(row["same_subject"]),
                    "TOKEN_ENTITY_OVERLAP": float(row["token_overlap"]),
                    "LOW_PARSE_CONFIDENCE": float(row["parse_confidence"]),
                }
                pair_outputs.append(
                    {
                        "left_story_id": str(left_id),
                        "right_story_id": str(right_id),
                        "redundancy_prob": float(row["redundancy_prob"]),
                        "group_id": group_map.get(left_id),
                        "model_name": model_name,
                        "is_redundant": bool(row["is_redundant"]),
                        "confidence_band": row["confidence_band"],
                        "reason_codes": row["reason_codes"],
                        "evidence": [
                            {"code": code, "value": evidence_values[code]}
                            for code in row["reason_codes"]
                        ],
                        "policy_version": RECOMMENDATION_POLICY_VERSION,
                        "pair_key": row["pair_key"],
                        "left_fingerprint": StoryEmbeddingService.fingerprint(left_story.story_text),
                        "right_fingerprint": StoryEmbeddingService.fingerprint(right_story.story_text),
                        "semantic_text_similarity": float(row["semantic_text_similarity"]),
                        "suggested_representative_story_id": representative.story_id,
                        "source_revision": source_revision,
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
                story_outputs.append(
                    {
                        "story_id": story.story_id,
                        "graph_relevance_score": float(min(max(priority_refined, 0.0), 1.0)),
                        "duplicate_score": float(min(max(redundancy_prob, 0.0), 1.0)),
                        "redundancy_group_id": group_map.get(story.story_id),
                    }
                )

            self.neo4j_service.save_story_priority_v2(workspace_id, story_outputs)
            self.neo4j_service.save_redundancy_pairs(workspace_id, pair_outputs)
            self.neo4j_service.save_classification_metrics(workspace_id, model_name, metrics)
            report("PUBLISHING", 90)
            redundant_edges = self.neo4j_service.count_redundancy_pairs(workspace_id)
            redundant_count = int(scored_pairs["is_redundant"].sum()) if not scored_pairs.empty else 0
            print(
                f"[BATCH] Classification model={model_name} "
                f"pairs_exported={len(pair_outputs)} "
                f"redundant_edges_in_db={redundant_edges} "
                f"redundant_above_threshold={redundant_count}"
            )

            print(f"[BATCH] DONE workspace: {workspace_id}")
            return {
                "status": "SUCCEEDED",
                "candidate_count": len(pair_outputs),
                "candidates": pair_outputs,
                "model_version": RECOMMENDATION_MODEL_VERSION,
                "policy_version": RECOMMENDATION_POLICY_VERSION,
            }

        except Exception as e:
            print(f"[BATCH] FAILED workspace {workspace_id}: {e}")
            raise e
