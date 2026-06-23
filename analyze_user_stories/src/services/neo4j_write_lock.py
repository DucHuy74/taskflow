import threading
import time
from contextlib import contextmanager
from pathlib import Path

from filelock import FileLock


class WorkspaceWriteLock:
    """Per-workspace write coordination for Neo4j (in-process + cross-process)."""

    _instance = None
    _init_lock = threading.Lock()

    def __new__(cls):
        with cls._init_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._state_lock = threading.Lock()
        self._shared_counts: dict[str, int] = {}
        self._exclusive_holders: set[str] = set()
        self._lock_dir = Path(__file__).resolve().parent.parent.parent / ".neo4j_locks"
        self._lock_dir.mkdir(parents=True, exist_ok=True)
        self._initialized = True

    def _rebuilding_flag(self, workspace_id: str) -> Path:
        return self._lock_dir / f"{workspace_id}.rebuilding"

    def _exclusive_file_lock(self, workspace_id: str) -> FileLock:
        return FileLock(self._lock_dir / f"{workspace_id}.exclusive.lock", timeout=300)

    def is_rebuilding(self, workspace_id: str) -> bool:
        return self._rebuilding_flag(workspace_id).exists()

    def _wait_until_not_rebuilding(self, workspace_id: str, timeout_seconds: float = 60.0):
        deadline = time.time() + timeout_seconds
        while self.is_rebuilding(workspace_id):
            if time.time() > deadline:
                raise TimeoutError(
                    f"Timed out waiting for rebuild to finish on workspace {workspace_id}"
                )
            time.sleep(0.1)

    @contextmanager
    def exclusive(self, workspace_id: str):
        file_lock = self._exclusive_file_lock(workspace_id)
        file_lock.acquire()
        flag = self._rebuilding_flag(workspace_id)
        flag.touch()
        with self._state_lock:
            self._exclusive_holders.add(workspace_id)
        try:
            yield
        finally:
            with self._state_lock:
                self._exclusive_holders.discard(workspace_id)
            if flag.exists():
                flag.unlink()
            file_lock.release()

    @contextmanager
    def shared(self, workspace_id: str):
        self._wait_until_not_rebuilding(workspace_id)
        while True:
            with self._state_lock:
                if workspace_id not in self._exclusive_holders:
                    self._shared_counts[workspace_id] = self._shared_counts.get(workspace_id, 0) + 1
                    break
            time.sleep(0.05)
        try:
            yield
        finally:
            with self._state_lock:
                self._shared_counts[workspace_id] -= 1
                if self._shared_counts[workspace_id] <= 0:
                    self._shared_counts.pop(workspace_id, None)


workspace_write_lock = WorkspaceWriteLock()
