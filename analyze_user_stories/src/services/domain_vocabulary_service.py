import time
from typing import Dict, Optional, Set

from src.models.analyze_story_result import AnalyzeStoryResult
from src.services.parsing.w2v_role_assigner import (
    DEFAULT_ACTIONS,
    DEFAULT_OBJECTS,
    DEFAULT_SUBJECTS,
)


class DomainVocabularyService:
    """Build subject/action/object vocabulary from successfully parsed stories in a workspace."""

    def __init__(self, db, cache_ttl_seconds: int = 300):
        self.db = db
        self.cache_ttl_seconds = cache_ttl_seconds
        self._cache: Dict[str, tuple] = {}

    def get_vocabulary(self, workspace_id: str) -> Dict[str, Set[str]]:
        cached = self._cache.get(workspace_id)
        if cached and (time.time() - cached[0]) < self.cache_ttl_seconds:
            return cached[1]

        vocab = self._load_from_db(workspace_id)
        self._cache[workspace_id] = (time.time(), vocab)
        return vocab

    def invalidate(self, workspace_id: str):
        self._cache.pop(workspace_id, None)

    def _load_from_db(self, workspace_id: str) -> Dict[str, Set[str]]:
        subjects = set(DEFAULT_SUBJECTS)
        actions = set(DEFAULT_ACTIONS)
        objects = set(DEFAULT_OBJECTS)

        if not self.db:
            return {"subjects": subjects, "actions": actions, "objects": objects}

        rows = (
            self.db.query(AnalyzeStoryResult)
            .filter(
                AnalyzeStoryResult.asr_workspace_id == workspace_id,
                AnalyzeStoryResult.asr_is_deleted == False,
                AnalyzeStoryResult.asr_status == "VALID",
            )
            .all()
        )

        for row in rows:
            if row.asr_subject_canonical:
                subjects.add(row.asr_subject_canonical.lower())
            elif row.asr_subject:
                subjects.add(row.asr_subject.lower())

            if row.asr_action_canonical:
                actions.add(row.asr_action_canonical.lower())
            elif row.asr_action:
                actions.add(row.asr_action.lower())

            if row.asr_object_canonical:
                objects.add(row.asr_object_canonical.lower())
            elif row.asr_object:
                objects.add(row.asr_object.lower())

        return {"subjects": subjects, "actions": actions, "objects": objects}
