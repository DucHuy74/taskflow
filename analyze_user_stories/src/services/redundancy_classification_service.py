from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from itertools import combinations
from typing import Dict, List, Tuple

import pandas as pd

from constant import (
    REDUNDANCY_HIGH_THRESHOLD,
    REDUNDANCY_SEMANTIC_HIGH_THRESHOLD,
    REDUNDANCY_W_ACTION,
    REDUNDANCY_W_OBJECT,
    REDUNDANCY_W_SEMANTIC,
    REDUNDANCY_W_SUBJECT,
    REDUNDANCY_W_TOKEN,
)
from src.utils import sorted_term_pair


TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


@dataclass
class StoryFeature:
    story_id: str
    subject: str
    action: str
    object_name: str
    story_text: str = ""
    parse_confidence: float = 0.0


class RedundancyClassificationService:
    """Explainable deterministic ranker used until human labels are sufficient."""

    def __init__(self, threshold: float = 0.65):
        self.threshold = threshold

    def build_story_schema(self, rows, story_text_by_id=None) -> List[StoryFeature]:
        story_text_by_id = story_text_by_id or {}
        stories: Dict[str, StoryFeature] = {}
        for row in rows:
            story_id = row.asr_user_story_id
            if not story_id:
                continue
            subject = (row.asr_subject_canonical or row.asr_subject or "").strip().lower()
            action = (row.asr_action_canonical or row.asr_action or "").strip().lower()
            object_name = (row.asr_object_canonical or row.asr_object or "").strip().lower()
            if not subject or not action or not object_name:
                continue
            stories[story_id] = StoryFeature(
                story_id=story_id,
                subject=subject,
                action=action,
                object_name=object_name,
                story_text=(story_text_by_id.get(story_id) or "").strip().lower(),
                parse_confidence=float(row.asr_confidence or 0.0),
            )
        return list(stories.values())

    @staticmethod
    def _token_overlap(left: str, right: str) -> float:
        left_tokens = set(TOKEN_PATTERN.findall(left))
        right_tokens = set(TOKEN_PATTERN.findall(right))
        union = left_tokens | right_tokens
        return len(left_tokens & right_tokens) / len(union) if union else 0.0

    def build_pair_dataset(
        self,
        stories: List[StoryFeature],
        similarity_map: Dict[Tuple[str, str], float],
        rule_map: Dict[Tuple[str, str], Dict[str, float]],
        priority_map: Dict[str, float],
        text_similarity_map: Dict[Tuple[str, str], float] | None = None,
    ) -> pd.DataFrame:
        text_similarity_map = text_similarity_map or {}
        rows = []
        for left, right in combinations(stories, 2):
            pair_key = sorted_term_pair(left.story_id, right.story_id)
            object_key = sorted_term_pair(left.object_name, right.object_name)
            action_key = sorted_term_pair(left.action, right.action)
            object_rule = rule_map.get(object_key, {})
            action_rule = rule_map.get(action_key, {})
            token_overlap = self._token_overlap(left.story_text, right.story_text)
            rows.append({
                "pair_key": "::".join(pair_key),
                "left_story_id": left.story_id,
                "right_story_id": right.story_id,
                "same_subject": float(left.subject == right.subject),
                "same_action": float(left.action == right.action),
                "same_object": float(left.object_name == right.object_name),
                "action_similarity": similarity_map.get(action_key, 0.0),
                "object_similarity": similarity_map.get(object_key, 0.0),
                "semantic_text_similarity": text_similarity_map.get(pair_key, token_overlap),
                "token_overlap": token_overlap,
                "parse_confidence": min(left.parse_confidence, right.parse_confidence),
                "rule_confidence": max(object_rule.get("confidence", 0.0), action_rule.get("confidence", 0.0)),
                "rule_lift": max(object_rule.get("lift", 0.0), action_rule.get("lift", 0.0)),
                "priority_gap": abs(priority_map.get(left.story_id, 0.0) - priority_map.get(right.story_id, 0.0)),
            })
        return pd.DataFrame(rows)

    def build_weak_labels(self, pair_df: pd.DataFrame) -> pd.DataFrame:
        # Kept for experiment compatibility only. Production never trains on these labels.
        pair_df = pair_df.copy()
        pair_df["weak_label"] = -1
        return pair_df

    @staticmethod
    def train_baseline_models(_labeled_df: pd.DataFrame):
        return None, {"reason": "production_uses_deterministic_ranker"}

    def predict_redundancy(self, _model, pair_df: pd.DataFrame) -> pd.DataFrame:
        pair_df = pair_df.copy()
        if pair_df.empty:
            pair_df["duplicate_score"] = []
            pair_df["redundancy_prob"] = []  # compatibility with the existing graph writer
            pair_df["confidence_band"] = []
            pair_df["is_redundant"] = []
            pair_df["reason_codes"] = []
            return pair_df

        action_signal = pair_df[["same_action", "action_similarity"]].max(axis=1)
        object_signal = pair_df[["same_object", "object_similarity"]].max(axis=1)
        score = (
            REDUNDANCY_W_SEMANTIC * pair_df["semantic_text_similarity"]
            + REDUNDANCY_W_ACTION * action_signal
            + REDUNDANCY_W_OBJECT * object_signal
            + REDUNDANCY_W_SUBJECT * pair_df["same_subject"]
            + REDUNDANCY_W_TOKEN * pair_df["token_overlap"]
        ).clip(0.0, 1.0)
        pair_df["duplicate_score"] = score
        pair_df["redundancy_prob"] = score
        pair_df["is_redundant"] = score >= self.threshold
        high = (
            (score >= REDUNDANCY_HIGH_THRESHOLD)
            & (pair_df["semantic_text_similarity"] >= REDUNDANCY_SEMANTIC_HIGH_THRESHOLD)
            & ((pair_df["same_action"] == 1.0) | (pair_df["same_object"] == 1.0))
        )
        pair_df["confidence_band"] = "LOW"
        pair_df.loc[pair_df["is_redundant"], "confidence_band"] = "MEDIUM"
        pair_df.loc[high, "confidence_band"] = "HIGH"
        pair_df["reason_codes"] = pair_df.apply(self._reason_codes, axis=1)
        return pair_df

    @staticmethod
    def _reason_codes(row):
        reasons = []
        if row["same_action"] == 1.0:
            reasons.append("SAME_CANONICAL_ACTION")
        if row["same_object"] == 1.0:
            reasons.append("SAME_CANONICAL_OBJECT")
        if row["semantic_text_similarity"] >= 0.65:
            reasons.append("SEMANTIC_TEXT_SIMILARITY")
        if row["same_subject"] == 1.0:
            reasons.append("SUBJECT_COMPATIBILITY")
        if row["token_overlap"] >= 0.5:
            reasons.append("TOKEN_ENTITY_OVERLAP")
        if row["parse_confidence"] < 0.5:
            reasons.append("LOW_PARSE_CONFIDENCE")
        return reasons

    @staticmethod
    def build_groups(pair_df: pd.DataFrame, _stories: List[StoryFeature]) -> Dict[str, str]:
        parent = {}

        def find(node):
            parent.setdefault(node, node)
            if parent[node] != node:
                parent[node] = find(parent[node])
            return parent[node]

        def union(left, right):
            left_root, right_root = find(left), find(right)
            if left_root != right_root:
                parent[max(left_root, right_root)] = min(left_root, right_root)

        for _, row in pair_df[pair_df["is_redundant"] == True].iterrows():
            union(row["left_story_id"], row["right_story_id"])

        components = {}
        for story_id in parent:
            components.setdefault(find(story_id), []).append(story_id)
        result = {}
        for members in components.values():
            if len(members) < 2:
                continue
            stable_members = sorted(members)
            group_key = "dup_" + hashlib.sha256("|".join(stable_members).encode()).hexdigest()[:16]
            result.update({story_id: group_key for story_id in stable_members})
        return result

    @staticmethod
    def aggregate_story_scores(pair_df: pd.DataFrame, stories: List[StoryFeature]) -> Dict[str, float]:
        score_map = {story.story_id: 0.0 for story in stories}
        for _, row in pair_df.iterrows():
            score = float(row["duplicate_score"])
            score_map[row["left_story_id"]] = max(score_map[row["left_story_id"]], score)
            score_map[row["right_story_id"]] = max(score_map[row["right_story_id"]], score)
        return score_map
