import sys
import types
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from src.models.analyze_story_result import AnalyzeStoryResult
from src.models.user_story_model import UserStory
from src.services.analyze_persistence_service import AnalyzePersistenceService
from src.services.graph_batch_service import GraphBatchService
from src.services.neo4j_service import Neo4jService


def _normalize(query):
    return " ".join(query.split())


class _Stop(Exception):
    pass


def _asr(story_id, action, sprint_id=None, backlog_id=None):
    return SimpleNamespace(
        asr_subject="user", asr_action=action, asr_object="item",
        asr_user_story_id=story_id, asr_sprint_id=sprint_id, asr_backlog_id=backlog_id,
    )


def _build_service(rows, replica_stories):
    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = rows
    source_db = MagicMock()
    source_db.query.return_value.filter.return_value.all.return_value = replica_stories
    semantic = MagicMock()
    # Semantic service returns VALID triples it was given (story_id preserved).
    semantic.process.side_effect = lambda svo: {
        "canonical_map": {}, "valid_svo": list(svo), "similarity_results": [],
    }
    stats = MagicMock()
    stats.generate_association_rules.return_value = ([], [])
    neo4j = MagicMock()
    service = GraphBatchService(semantic, stats, neo4j, db, source_db)
    service.priority_service = MagicMock()
    service.priority_service.compute_priority_for_workspace.side_effect = _Stop()
    return service, neo4j, source_db


def _saved_context(neo4j):
    svo_list = neo4j.save_svo.call_args[0][0]
    return {svo["story_id"]: (svo["sprint_id"], svo["backlog_id"]) for svo in svo_list}


class TestBatchRebuildStoryContext(unittest.TestCase):

    def test_batch_passes_current_replica_context_per_story(self):
        rows = [
            _asr("s1", "a1", sprint_id="old-sprint", backlog_id="old-backlog"),
            _asr("s2", "a2"),
            _asr("s3", "a3", sprint_id="spr-3"),
        ]
        replica = [
            SimpleNamespace(id="s1", sprint_id="spr-1", backlog_id=None),
            SimpleNamespace(id="s2", sprint_id=None, backlog_id="bl-2"),
            SimpleNamespace(id="s3", sprint_id="spr-3b", backlog_id="bl-3"),
        ]
        service, neo4j, source_db = _build_service(rows, replica)

        with patch("builtins.print"), self.assertRaises(_Stop):
            service.rebuild_workspace("ws-1")

        source_db.query.assert_any_call(UserStory)
        self.assertEqual(
            {"s1": ("spr-1", None), "s2": (None, "bl-2"), "s3": ("spr-3b", "bl-3")},
            _saved_context(neo4j),
        )
        args, kwargs = neo4j.save_svo.call_args
        self.assertEqual("ws-1", args[2])
        self.assertEqual("BATCH", kwargs["source"])

    def test_fallback_to_asr_columns_when_story_missing_in_replica(self):
        rows = [
            _asr("s1", "a1", sprint_id="asr-spr-1", backlog_id="asr-bl-1"),
            _asr("s2", "a2", sprint_id="asr-spr-2"),
            _asr("s3", "a3"),
        ]
        replica = [SimpleNamespace(id="s2", sprint_id="spr-2", backlog_id=None)]
        service, neo4j, _ = _build_service(rows, replica)

        with patch("builtins.print"), self.assertRaises(_Stop):
            service.rebuild_workspace("ws-1")

        self.assertEqual(
            {"s1": ("asr-spr-1", "asr-bl-1"), "s2": ("spr-2", None), "s3": (None, None)},
            _saved_context(neo4j),
        )

    def test_fallback_to_asr_columns_when_replica_fails(self):
        rows = [_asr(f"s{i}", f"a{i}", sprint_id=f"asr-spr-{i}") for i in range(3)]
        service, neo4j, source_db = _build_service(rows, [])
        source_db.query.side_effect = RuntimeError("replica down")

        with patch("builtins.print"), self.assertRaises(_Stop):
            service.rebuild_workspace("ws-1")

        self.assertEqual(
            {f"s{i}": (f"asr-spr-{i}", None) for i in range(3)},
            _saved_context(neo4j),
        )


class TestSaveSvoPerItemContext(unittest.TestCase):

    def test_per_item_context_overrides_function_args(self):
        conn = MagicMock()
        Neo4jService(conn).save_svo(
            [
                {"subject": "u", "action": "a", "object": "o", "story_id": "s1",
                 "sprint_id": "spr-1", "backlog_id": None},
                {"subject": "u", "action": "b", "object": "o", "story_id": "s2"},
            ],
            {},
            "ws-1",
            sprint_id="fn-spr",
            backlog_id="fn-bl",
            source="BATCH",
        )

        query, params = conn.execute_write.call_args[0]
        normalized = _normalize(query)
        self.assertIn("r1.sprint_id = row.sprint_id", normalized)
        self.assertIn("r1.backlog_id = row.backlog_id", normalized)
        self.assertIn("r2.sprint_id = row.sprint_id", normalized)
        self.assertIn("r2.backlog_id = row.backlog_id", normalized)
        self.assertIn("SET sub:Subject, act:Action, obj:Object", normalized)
        rows = {row["story_id"]: row for row in params["data"]}
        # Explicit None in the item wins over the function-level value.
        self.assertEqual(("spr-1", None), (rows["s1"]["sprint_id"], rows["s1"]["backlog_id"]))
        self.assertEqual(("fn-spr", "fn-bl"), (rows["s2"]["sprint_id"], rows["s2"]["backlog_id"]))

    def test_realtime_caller_uses_function_args(self):
        conn = MagicMock()
        Neo4jService(conn).save_svo(
            [{"subject": "u", "action": "a", "object": "o"}],
            {}, "ws-1", "s9", "spr-9", "bl-9", source="REALTIME",
        )
        _, params = conn.execute_write.call_args[0]
        row = params["data"][0]
        self.assertEqual(("s9", "spr-9", "bl-9"), (row["story_id"], row["sprint_id"], row["backlog_id"]))
        self.assertEqual("REALTIME", params["source"])


class TestPersistenceUpdateContext(unittest.TestCase):

    def test_update_context_updates_all_rows_of_story(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.update.return_value = 2

        updated = AnalyzePersistenceService(db).update_context("s1", "spr-2", "bl-2")

        self.assertEqual(2, updated)
        db.query.assert_called_once_with(AnalyzeStoryResult)
        values = db.query.return_value.filter.return_value.update.call_args[0][0]
        self.assertEqual(
            {AnalyzeStoryResult.asr_sprint_id: "spr-2", AnalyzeStoryResult.asr_backlog_id: "bl-2"},
            values,
        )
        db.commit.assert_called_once()


class TestMovedEventSyncsAsrColumns(unittest.TestCase):

    def _import_consumer(self):
        # consumer.py loads NLP models, Neo4j and MySQL at import time: stub those modules.
        fakes = {
            "pika": types.ModuleType("pika"),
            "src.database.db": types.ModuleType("src.database.db"),
            "src.database.db_slave": types.ModuleType("src.database.db_slave"),
            "src.database.neo4j": types.ModuleType("src.database.neo4j"),
            "src.utils.model_loader": types.ModuleType("src.utils.model_loader"),
            "src.services.similarity_factory": types.ModuleType("src.services.similarity_factory"),
            "src.services.analyze_parsing_service": types.ModuleType("src.services.analyze_parsing_service"),
            "src.services.semantic_normalization_service": types.ModuleType("src.services.semantic_normalization_service"),
            "src.services.statistics_service": types.ModuleType("src.services.statistics_service"),
            "src.services.analyze_coordinator_service": types.ModuleType("src.services.analyze_coordinator_service"),
            "src.services.user_story_read_service": types.ModuleType("src.services.user_story_read_service"),
            "src.services.domain_vocabulary_service": types.ModuleType("src.services.domain_vocabulary_service"),
        }
        fakes["src.database.db"].db_manager = MagicMock()
        fakes["src.database.db_slave"].get_slave_db = MagicMock()
        fakes["src.database.neo4j"].Neo4jConnection = MagicMock()
        fakes["src.utils.model_loader"].load_models = MagicMock(return_value=(MagicMock(), MagicMock()))
        fakes["src.services.similarity_factory"].build_similarity_calculator = MagicMock()
        fakes["src.services.analyze_parsing_service"].AnalyzeParsingService = MagicMock()
        fakes["src.services.semantic_normalization_service"].SemanticNormalizationService = MagicMock()
        fakes["src.services.statistics_service"].StatisticsService = MagicMock()
        fakes["src.services.analyze_coordinator_service"].AnalyzeCoordinatorService = MagicMock()
        fakes["src.services.user_story_read_service"].UserStoryReadService = MagicMock()
        fakes["src.services.domain_vocabulary_service"].DomainVocabularyService = MagicMock()

        patcher = patch.dict(sys.modules, fakes)
        patcher.start()
        self.addCleanup(patcher.stop)
        sys.modules.pop("src.messaging.consumer", None)
        self.addCleanup(sys.modules.pop, "src.messaging.consumer", None)
        import src.messaging.consumer as consumer
        return consumer

    def test_moved_event_updates_asr_columns_and_neo4j(self):
        consumer = self._import_consumer()
        db = MagicMock()
        db.query.return_value.filter.return_value.update.return_value = 3
        consumer.db_manager.get_session.return_value = (session for session in [db])
        neo4j = MagicMock()

        with patch.object(consumer, "neo4j_service", neo4j),                 patch.object(consumer, "workspace_write_lock", MagicMock()) as lock,                 patch("builtins.print"):
            consumer.handle_story_moved({"id": "s1", "sprintId": "spr-2", "backlogId": None, "workspaceId": "ws-1"})

        values = db.query.return_value.filter.return_value.update.call_args[0][0]
        self.assertEqual(
            {AnalyzeStoryResult.asr_sprint_id: "spr-2", AnalyzeStoryResult.asr_backlog_id: None},
            values,
        )
        db.commit.assert_called_once()
        neo4j.update_story_context.assert_called_once_with(story_id="s1", sprint_id="spr-2", backlog_id=None)
        lock.shared.assert_called_once_with("ws-1")


if __name__ == "__main__":
    unittest.main()
