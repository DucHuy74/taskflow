from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations
from typing import Dict, List, Tuple

from src.utils import sorted_term_pair

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, f1_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


@dataclass
class StoryFeature:
    story_id: str
    subject: str
    action: str
    object_name: str


class RedundancyClassificationService:
    def __init__(self, threshold: float = 0.6):
        self.threshold = threshold

    def build_story_schema(self, rows) -> List[StoryFeature]:
        stories: List[StoryFeature] = []

        for row in rows:
            if not row.asr_user_story_id:
                continue

            subject = (row.asr_subject_canonical or row.asr_subject or "").strip().lower()
            action = (row.asr_action_canonical or row.asr_action or "").strip().lower()
            object_name = (row.asr_object_canonical or row.asr_object or "").strip().lower()

            if not subject or not action or not object_name:
                continue

            stories.append(
                StoryFeature(
                    story_id=row.asr_user_story_id,
                    subject=subject,
                    action=action,
                    object_name=object_name,
                )
            )

        dedup: Dict[str, StoryFeature] = {}
        for story in stories:
            dedup[story.story_id] = story

        return list(dedup.values())

    def build_pair_dataset(
        self,
        stories: List[StoryFeature],
        similarity_map: Dict[Tuple[str, str], float],
        rule_map: Dict[Tuple[str, str], Dict[str, float]],
        priority_map: Dict[str, float],
    ) -> pd.DataFrame:
        rows = []

        for left, right in combinations(stories, 2):
            pair_key = sorted_term_pair(left.story_id, right.story_id)
            object_key = sorted_term_pair(left.object_name, right.object_name)
            action_key = sorted_term_pair(left.action, right.action)

            object_similarity = similarity_map.get(object_key, 0.0)
            action_similarity = similarity_map.get(action_key, 0.0)

            object_rule = rule_map.get(object_key, {})
            action_rule = rule_map.get(action_key, {})

            rule_confidence = max(object_rule.get("confidence", 0.0), action_rule.get("confidence", 0.0))
            rule_lift = max(object_rule.get("lift", 0.0), action_rule.get("lift", 0.0))

            same_subject = 1.0 if left.subject == right.subject else 0.0
            same_action = 1.0 if left.action == right.action else 0.0
            same_object = 1.0 if left.object_name == right.object_name else 0.0
            priority_gap = abs(priority_map.get(left.story_id, 0.0) - priority_map.get(right.story_id, 0.0))

            rows.append(
                {
                    "pair_key": pair_key,
                    "left_story_id": left.story_id,
                    "right_story_id": right.story_id,
                    "same_subject": same_subject,
                    "same_action": same_action,
                    "same_object": same_object,
                    "action_similarity": action_similarity,
                    "object_similarity": object_similarity,
                    "rule_confidence": rule_confidence,
                    "rule_lift": rule_lift,
                    "priority_gap": priority_gap,
                }
            )

        return pd.DataFrame(rows)

    def build_weak_labels(self, pair_df: pd.DataFrame) -> pd.DataFrame:
        if pair_df.empty:
            pair_df["weak_label"] = []
            return pair_df

        positive_mask = (
            (
                (pair_df["object_similarity"] >= 0.75)
                | ((pair_df["same_object"] == 1.0) & (pair_df["action_similarity"] >= 0.5))
            )
            & (pair_df["rule_confidence"] >= 0.5)
            & (pair_df["rule_lift"] >= 1.0)
        )

        negative_mask = (
            (pair_df["object_similarity"] <= 0.25)
            & (pair_df["action_similarity"] <= 0.25)
            & (pair_df["same_object"] == 0.0)
            & (pair_df["rule_confidence"] <= 0.3)
        )

        pair_df["weak_label"] = -1
        pair_df.loc[positive_mask, "weak_label"] = 1
        pair_df.loc[negative_mask, "weak_label"] = 0
        return pair_df

    def train_baseline_models(self, labeled_df: pd.DataFrame):
        feature_cols = [
            "same_subject",
            "same_action",
            "same_object",
            "action_similarity",
            "object_similarity",
            "rule_confidence",
            "rule_lift",
            "priority_gap",
        ]

        if labeled_df.empty:
            return None, {"reason": "no_labeled_pairs"}

        if labeled_df["weak_label"].nunique() < 2:
            return None, {"reason": "single_class_labels"}

        x = labeled_df[feature_cols]
        y = labeled_df["weak_label"]

        x_train, x_test, y_train, y_test = train_test_split(
            x,
            y,
            test_size=0.3,
            random_state=42,
            stratify=y,
        )

        models = {
            "logistic_regression": Pipeline(
                steps=[
                    ("scaler", StandardScaler()),
                    ("clf", LogisticRegression(max_iter=200, class_weight="balanced")),
                ]
            ),
            "random_forest": RandomForestClassifier(
                n_estimators=250,
                random_state=42,
                class_weight="balanced_subsample",
            ),
            "hist_gradient_boosting": HistGradientBoostingClassifier(random_state=42),
        }

        scores = {}
        fitted_models = {}

        for name, model in models.items():
            model.fit(x_train, y_train)
            pred = model.predict(x_test)

            if hasattr(model, "predict_proba"):
                proba = model.predict_proba(x_test)[:, 1]
            else:
                decision = model.decision_function(x_test)
                proba = 1 / (1 + np.exp(-decision))

            scores[name] = {
                "f1_redundant": float(f1_score(y_test, pred, pos_label=1)),
                "recall_redundant": float(recall_score(y_test, pred, pos_label=1)),
                "pr_auc": float(average_precision_score(y_test, proba)),
            }
            fitted_models[name] = model

        best_name = max(scores.keys(), key=lambda model_name: scores[model_name]["f1_redundant"])
        return fitted_models[best_name], {"best_model": best_name, "metrics": scores}

    def predict_redundancy(self, model, pair_df: pd.DataFrame) -> pd.DataFrame:
        feature_cols = [
            "same_subject",
            "same_action",
            "same_object",
            "action_similarity",
            "object_similarity",
            "rule_confidence",
            "rule_lift",
            "priority_gap",
        ]

        if pair_df.empty:
            pair_df["redundancy_prob"] = []
            pair_df["is_redundant"] = []
            return pair_df

        if model is None:
            score = (
                0.35 * pair_df["object_similarity"]
                + 0.2 * pair_df["action_similarity"]
                + 0.15 * pair_df["same_object"]
                + 0.15 * pair_df["rule_confidence"]
                + 0.15 * pair_df["same_action"]
            )
            pair_df["redundancy_prob"] = score.clip(0.0, 1.0)
        else:
            pair_df["redundancy_prob"] = model.predict_proba(pair_df[feature_cols])[:, 1]

        pair_df["is_redundant"] = pair_df["redundancy_prob"] >= self.threshold
        return pair_df

    def build_groups(self, pair_df: pd.DataFrame, stories: List[StoryFeature]) -> Dict[str, str]:
        parent = {story.story_id: story.story_id for story in stories}

        def find(node):
            while parent[node] != node:
                parent[node] = parent[parent[node]]
                node = parent[node]
            return node

        def union(left, right):
            left_root = find(left)
            right_root = find(right)
            if left_root != right_root:
                parent[right_root] = left_root

        for _, row in pair_df[pair_df["is_redundant"] == True].iterrows():
            union(row["left_story_id"], row["right_story_id"])

        root_to_group = {}
        group_map = {}
        index = 1

        for story in stories:
            root = find(story.story_id)
            if root not in root_to_group:
                root_to_group[root] = f"group_{index}"
                index += 1
            group_map[story.story_id] = root_to_group[root]

        return group_map

    def aggregate_story_scores(self, pair_df: pd.DataFrame, stories: List[StoryFeature]) -> Dict[str, float]:
        score_map = {story.story_id: 0.0 for story in stories}
        if pair_df.empty:
            return score_map

        for _, row in pair_df.iterrows():
            left = row["left_story_id"]
            right = row["right_story_id"]
            prob = float(row["redundancy_prob"])
            score_map[left] = max(score_map[left], prob)
            score_map[right] = max(score_map[right], prob)

        return score_map
