import unittest
from types import SimpleNamespace

import pandas as pd

from src.services.redundancy_classification_service import (
    RedundancyClassificationService,
    StoryFeature,
)
from src.services.semantic_normalization_service import SemanticNormalizationService


class _Similarity:
    def calculate(self, left, right, **_kwargs):
        return 0.9 if {left, right} in ({"reset", "recover"}, {"password", "credentials"}) else 0.1


class RecommendationPolicyTest(unittest.TestCase):
    def test_semantic_normalization_retains_action_and_object_pairs(self):
        service = SemanticNormalizationService(_Similarity())
        result = service.process([
            {"status": "VALID", "action": "reset", "object": "password"},
            {"status": "VALID", "action": "recover", "object": "credentials"},
        ])
        term_types = {item["term_type"] for item in result["similarity_results"]}
        self.assertEqual(term_types, {"ACTION", "OBJECT"})

    def test_deterministic_ranker_is_explainable_and_not_rule_trained(self):
        service = RedundancyClassificationService(threshold=0.65)
        stories = [
            StoryFeature("US-1", "user", "reset", "password", "reset my password", 1.0),
            StoryFeature("US-2", "user", "reset", "password", "reset my password", 1.0),
        ]
        pairs = service.build_pair_dataset(stories, {}, {}, {})
        scored = service.predict_redundancy(None, pairs)
        self.assertTrue(bool(scored.iloc[0]["is_redundant"]))
        self.assertEqual(scored.iloc[0]["confidence_band"], "HIGH")
        self.assertIn("SAME_CANONICAL_OBJECT", scored.iloc[0]["reason_codes"])
        model, metadata = service.train_baseline_models(pd.DataFrame())
        self.assertIsNone(model)
        self.assertEqual(metadata["reason"], "production_uses_deterministic_ranker")

    def test_groups_are_stable_and_do_not_include_singletons(self):
        service = RedundancyClassificationService()
        pairs = pd.DataFrame([{
            "left_story_id": "US-2",
            "right_story_id": "US-1",
            "is_redundant": True,
        }])
        group = service.build_groups(pairs, [])
        reversed_group = service.build_groups(pairs.iloc[::-1], [])
        self.assertEqual(group, reversed_group)
        self.assertEqual(group["US-1"], group["US-2"])
        self.assertTrue(group["US-1"].startswith("dup_"))

    def test_story_schema_carries_text_and_parse_confidence(self):
        row = SimpleNamespace(
            asr_user_story_id="US-1",
            asr_subject_canonical="user",
            asr_subject="user",
            asr_action_canonical="reset",
            asr_action="reset",
            asr_object_canonical="password",
            asr_object="password",
            asr_confidence=0.8,
        )
        stories = RedundancyClassificationService().build_story_schema(
            [row], {"US-1": "As a user, I want to reset my password"}
        )
        self.assertEqual(stories[0].story_text, "as a user, i want to reset my password")
        self.assertEqual(stories[0].parse_confidence, 0.8)


if __name__ == "__main__":
    unittest.main()
