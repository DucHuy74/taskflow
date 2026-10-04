import hashlib
import threading
from contextlib import contextmanager

class WorkspaceWriteLock:
    """Cross-process serialization for all Neo4j writes in one workspace.

    MySQL advisory locks are connection-scoped, so the dedicated connection must
    remain open for the complete critical section. `shared` is intentionally an
    alias of `exclusive`: Neo4j writes are serialized for correctness.
    """

    def __init__(self, engine=None, timeout_seconds: int = 300):
        if engine is None:
            from src.database.db import db_manager
            engine = db_manager.engine
        self.engine = engine
        self.timeout_seconds = timeout_seconds
        self._held = set()
        self._state_lock = threading.Lock()

    @staticmethod
    def _lock_name(workspace_id: str) -> str:
        digest = hashlib.sha256(workspace_id.encode("utf-8")).hexdigest()[:40]
        return f"taskflow:neo4j:{digest}"

    def is_rebuilding(self, workspace_id: str) -> bool:
        with self._state_lock:
            return workspace_id in self._held

    @contextmanager
    def exclusive(self, workspace_id: str):
        try:
            from sqlalchemy import text
        except ImportError:
            text = lambda statement: statement
        lock_name = self._lock_name(workspace_id)
        with self.engine.connect() as connection:
            acquired = connection.execute(
                text("SELECT GET_LOCK(:lock_name, :timeout_seconds)"),
                {"lock_name": lock_name, "timeout_seconds": self.timeout_seconds},
            ).scalar()
            if acquired != 1:
                raise TimeoutError(f"Timed out acquiring Neo4j workspace lock for {workspace_id}")
            with self._state_lock:
                self._held.add(workspace_id)
            try:
                yield
            finally:
                with self._state_lock:
                    self._held.discard(workspace_id)
                connection.execute(text("SELECT RELEASE_LOCK(:lock_name)"), {"lock_name": lock_name})

    @contextmanager
    def shared(self, workspace_id: str):
        with self.exclusive(workspace_id):
            yield


class _LazyWorkspaceWriteLock:
    def __init__(self):
        self._instance = None
        self._lock = threading.Lock()

    def _get(self):
        if self._instance is None:
            with self._lock:
                if self._instance is None:
                    self._instance = WorkspaceWriteLock()
        return self._instance

    def shared(self, workspace_id):
        return self._get().shared(workspace_id)

    def exclusive(self, workspace_id):
        return self._get().exclusive(workspace_id)

    def is_rebuilding(self, workspace_id):
        return self._get().is_rebuilding(workspace_id)


workspace_write_lock = _LazyWorkspaceWriteLock()
