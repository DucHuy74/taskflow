import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from src.models.user_story_model import UserStory
from src.services.graph_batch_service import GraphBatchService


class TestGraphBatchServiceDatabaseRouting(unittest.TestCase):

    def test_story_text_is_loaded_from_source_database(self):
        analysis_db = MagicMock()
        source_db = MagicMock()
        source_db.query.return_value.filter.return_value.all.return_value = [
            SimpleNamespace(id="story-1", story_text="First story"),
            SimpleNamespace(id="story-2", story_text="Second story"),
        ]

        service = GraphBatchService(
            semantic_service=MagicMock(),
            statistics_service=MagicMock(),
            neo4j_service=MagicMock(),
            db=analysis_db,
            source_db=source_db,
        )

        result = service._load_story_text_by_id([
            SimpleNamespace(asr_user_story_id="story-1"),
            SimpleNamespace(asr_user_story_id="story-2"),
            SimpleNamespace(asr_user_story_id="story-1"),
        ])

        self.assertEqual({
            "story-1": "First story",
            "story-2": "Second story",
        }, result)
        source_db.query.assert_called_once_with(UserStory)
        analysis_db.query.assert_not_called()

    def test_empty_story_ids_do_not_query_source_database(self):
        source_db = MagicMock()
        service = GraphBatchService(
            semantic_service=MagicMock(),
            statistics_service=MagicMock(),
            neo4j_service=MagicMock(),
            db=MagicMock(),
            source_db=source_db,
        )

        result = service._load_story_text_by_id([
            SimpleNamespace(asr_user_story_id=None),
        ])

        self.assertEqual({}, result)
        source_db.query.assert_not_called()


if __name__ == "__main__":
    unittest.main()
