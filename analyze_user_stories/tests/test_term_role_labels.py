import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from src.services.graph_batch_service import GraphBatchService
from src.services.graph_building_service import GraphBuildingService
from src.services.neo4j_service import Neo4jService


def _normalize(query):
    return " ".join(query.split())


class TestSaveSvoRoleLabels(unittest.TestCase):

    def test_save_svo_sets_role_labels_with_edges(self):
        conn = MagicMock()
        service = Neo4jService(conn)

        service.save_svo(
            [{"subject": "user", "action": "create", "object": "backlog", "story_id": "s1"}],
            {},
            "ws-1",
            source="BATCH",
        )

        conn.execute_write.assert_called_once()
        query, params = conn.execute_write.call_args[0]
        normalized = _normalize(query)
        self.assertIn("SET sub:Subject, act:Action, obj:Object", normalized)
        self.assertIn("MERGE (sub)-[r1:PERFORM", normalized)
        self.assertIn("MERGE (act)-[r2:TARGET", normalized)
        self.assertEqual("ws-1", params["ws"])
        self.assertEqual("BATCH", params["source"])


class TestRefreshRoleLabels(unittest.TestCase):

    def test_refresh_removes_then_resets_labels_scoped_to_workspace(self):
        conn = MagicMock()
        conn.execute_write.return_value = [{"terms": 3, "subjects": 1, "actions": 1, "objects": 2}]
        service = Neo4jService(conn)

        result = service.refresh_role_labels("ws-1")

        query, params = conn.execute_write.call_args[0]
        normalized = _normalize(query)
        self.assertEqual({"ws": "ws-1"}, params)
        self.assertIn("MATCH (t:Term {workspace_id: $ws})", normalized)
        self.assertIn("REMOVE t:Subject:Action:Object", normalized)
        self.assertIn("SET t:Subject", normalized)
        self.assertIn("SET t:Action", normalized)
        self.assertIn("SET t:Object", normalized)
        self.assertLess(normalized.index("REMOVE"), normalized.index("SET t:Subject"))
        self.assertEqual(2, result["objects"])

    def test_refresh_skips_without_workspace(self):
        conn = MagicMock()
        self.assertIsNone(Neo4jService(conn).refresh_role_labels(None))
        conn.execute_write.assert_not_called()

    def test_preview_is_read_only(self):
        conn = MagicMock()
        conn.execute.return_value = [{"terms": 0}]
        Neo4jService(conn).preview_role_labels("ws-1")
        conn.execute.assert_called_once()
        conn.execute_write.assert_not_called()
        self.assertNotIn("REMOVE", conn.execute.call_args[0][0])


class TestRealtimeRefreshesLabels(unittest.TestCase):

    def test_process_realtime_refreshes_labels_after_save(self):
        semantic = MagicMock()
        semantic.process.return_value = {"canonical_map": {}, "valid_svo": [{"subject": "a"}]}
        neo4j = MagicMock()

        GraphBuildingService(semantic, neo4j).process_realtime(
            svo_list=[{"subject": "a", "action": "b", "object": "c"}],
            workspace_id="ws-1",
            story_id="s1",
        )

        calls = [c[0] for c in neo4j.method_calls]
        self.assertEqual(["save_svo", "refresh_role_labels"], calls)
        neo4j.refresh_role_labels.assert_called_once_with("ws-1")

    def test_process_realtime_without_svo_does_nothing(self):
        neo4j = MagicMock()
        GraphBuildingService(MagicMock(), neo4j).process_realtime([], "ws-1", "s1")
        neo4j.refresh_role_labels.assert_not_called()


class TestBatchRebuildRefreshesLabels(unittest.TestCase):

    def test_rebuild_refreshes_labels_after_writing_svo(self):
        rows = [
            SimpleNamespace(asr_subject="user", asr_action=f"act{i}", asr_object="item",
                            asr_user_story_id=f"s{i}")
            for i in range(3)
        ]
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = rows
        semantic = MagicMock()
        semantic.process.return_value = {"canonical_map": {}, "valid_svo": [], "similarity_results": []}
        stats = MagicMock()
        stats.generate_association_rules.return_value = ([], [])
        neo4j = MagicMock()

        class _Stop(Exception):
            pass

        service = GraphBatchService(semantic, stats, neo4j, db, MagicMock())
        # Stop right after the graph-writing phase; later stages are out of scope here.
        service.priority_service = MagicMock()
        service.priority_service.compute_priority_for_workspace.side_effect = _Stop()

        with patch("builtins.print"), self.assertRaises(_Stop):
            service.rebuild_workspace("ws-1")

        calls = [c[0] for c in neo4j.method_calls]
        self.assertLess(calls.index("clear_workspace"), calls.index("save_svo"))
        self.assertLess(calls.index("save_svo"), calls.index("refresh_role_labels"))
        neo4j.refresh_role_labels.assert_called_once_with("ws-1")


class TestBackfillScript(unittest.TestCase):

    def _load(self):
        path = Path(__file__).resolve().parent.parent / "scripts" / "backfill_term_role_labels.py"
        spec = importlib.util.spec_from_file_location("backfill_term_role_labels", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_runs_relabel_for_every_workspace(self):
        module = self._load()
        service = MagicMock()
        service.list_term_workspace_ids.return_value = ["ws-1", "ws-2"]
        service.refresh_role_labels.return_value = {}
        with patch("builtins.print"):
            module.run(service)
        self.assertEqual(["ws-1", "ws-2"], [c[0][0] for c in service.refresh_role_labels.call_args_list])

    def test_dry_run_with_workspace_does_not_write(self):
        module = self._load()
        service = MagicMock()
        service.preview_role_labels.return_value = {"terms": 1}
        with patch("builtins.print"):
            module.run(service, workspace="ws-9", dry_run=True)
        service.list_term_workspace_ids.assert_not_called()
        service.refresh_role_labels.assert_not_called()
        service.preview_role_labels.assert_called_once_with("ws-9")


if __name__ == "__main__":
    unittest.main()
