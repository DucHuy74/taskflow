import threading
import time
import unittest

from src.services.neo4j_write_lock import WorkspaceWriteLock


class _ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar(self):
        return self.value


class _Connection:
    def __init__(self, engine):
        self.engine = engine
        self.held_lock = None

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        if self.held_lock and self.held_lock.locked():
            self.held_lock.release()

    def execute(self, statement, params):
        if "GET_LOCK" in str(statement):
            lock = self.engine.locks.setdefault(params["lock_name"], threading.Lock())
            acquired = lock.acquire(timeout=params["timeout_seconds"])
            self.held_lock = lock if acquired else None
            return _ScalarResult(1 if acquired else 0)
        if self.held_lock and self.held_lock.locked():
            self.held_lock.release()
            self.held_lock = None
        return _ScalarResult(1)


class _Engine:
    def __init__(self):
        self.locks = {}

    def connect(self):
        return _Connection(self)


class TestNeo4jWriteLock(unittest.TestCase):

    def setUp(self):
        self.lock = WorkspaceWriteLock(engine=_Engine(), timeout_seconds=2)
        self.workspace_id = f"test-ws-{time.time_ns()}"

    def test_exclusive_sets_rebuilding_flag(self):
        self.assertFalse(self.lock.is_rebuilding(self.workspace_id))
        with self.lock.exclusive(self.workspace_id):
            self.assertTrue(self.lock.is_rebuilding(self.workspace_id))
        self.assertFalse(self.lock.is_rebuilding(self.workspace_id))

    def test_shared_waits_for_exclusive(self):
        events = []

        def rebuild():
            with self.lock.exclusive(self.workspace_id):
                events.append("rebuild_start")
                time.sleep(0.2)
                events.append("rebuild_end")

        def realtime():
            time.sleep(0.05)
            with self.lock.shared(self.workspace_id):
                events.append("realtime")

        rebuild_thread = threading.Thread(target=rebuild)
        realtime_thread = threading.Thread(target=realtime)

        rebuild_thread.start()
        realtime_thread.start()
        rebuild_thread.join(timeout=5)
        realtime_thread.join(timeout=5)

        self.assertEqual(events[0], "rebuild_start")
        self.assertEqual(events[-1], "realtime")
        self.assertIn("rebuild_end", events)
        self.assertLess(events.index("rebuild_end"), events.index("realtime"))

    def test_concurrent_shared_writes_allowed(self):
        counter = {"value": 0}

        def write():
            with self.lock.shared(self.workspace_id):
                current = counter["value"]
                time.sleep(0.05)
                counter["value"] = current + 1

        threads = [threading.Thread(target=write) for _ in range(5)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=5)

        self.assertEqual(counter["value"], 5)


if __name__ == "__main__":
    unittest.main()
