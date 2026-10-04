from __future__ import annotations

import hashlib
import logging

import numpy as np
from sentence_transformers import SentenceTransformer

from constant import RECOMMENDATION_MODEL_VERSION
from src.models.story_embedding import StoryEmbedding
from src.utils.model_loader import ensure_local_sbert_model


logger = logging.getLogger(__name__)


class StoryEmbeddingService:
    """Versioned sentence embeddings with a persistent MySQL cache."""

    def __init__(self, db, model=None):
        self.db = db
        self._model = model

    @staticmethod
    def fingerprint(text: str) -> str:
        normalized = " ".join((text or "").strip().lower().split())
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    @property
    def model(self):
        if self._model is None:
            self._model = SentenceTransformer(str(ensure_local_sbert_model()))
        return self._model

    def embeddings(self, workspace_id: str, stories) -> dict[str, np.ndarray]:
        result = {}
        missing = []
        for story in stories:
            if not story.story_text:
                continue
            fingerprint = self.fingerprint(story.story_text)
            cached = self.db.query(StoryEmbedding).filter_by(
                workspace_id=workspace_id,
                story_id=story.story_id,
                content_fingerprint=fingerprint,
                model_version=RECOMMENDATION_MODEL_VERSION,
            ).first()
            if cached:
                result[story.story_id] = np.frombuffer(cached.vector, dtype=np.float32)
            else:
                missing.append((story, fingerprint))

        if missing:
            vectors = self.model.encode(
                [story.story_text for story, _ in missing],
                normalize_embeddings=True,
                convert_to_numpy=True,
            ).astype(np.float32)
            for (story, fingerprint), vector in zip(missing, vectors):
                result[story.story_id] = vector
                self.db.add(StoryEmbedding(
                    workspace_id=workspace_id,
                    story_id=story.story_id,
                    content_fingerprint=fingerprint,
                    model_version=RECOMMENDATION_MODEL_VERSION,
                    vector=vector.tobytes(),
                ))
            self.db.commit()
        return result

    @staticmethod
    def nearest_pairs(vectors: dict[str, np.ndarray], top_k: int = 20):
        if len(vectors) < 2:
            return {}
        story_ids = list(vectors)
        matrix = np.vstack([vectors[story_id] for story_id in story_ids]).astype(np.float32)
        neighbor_count = min(top_k + 1, len(story_ids))
        pairs = {}
        try:
            import hnswlib

            index = hnswlib.Index(space="cosine", dim=matrix.shape[1])
            index.init_index(max_elements=len(story_ids), ef_construction=200, M=16, random_seed=42)
            index.add_items(matrix, np.arange(len(story_ids)))
            index.set_ef(max(50, neighbor_count))
            labels, distances = index.knn_query(matrix, k=neighbor_count)
        except ImportError:
            logger.warning("hnswlib_unavailable_using_exact_cosine")
            similarities = matrix @ matrix.T
            labels = np.argsort(-similarities, axis=1)[:, :neighbor_count]
            distances = 1.0 - np.take_along_axis(similarities, labels, axis=1)

        for left_index, (neighbors, neighbor_distances) in enumerate(zip(labels, distances)):
            for right_index, distance in zip(neighbors, neighbor_distances):
                if left_index == int(right_index):
                    continue
                key = tuple(sorted((story_ids[left_index], story_ids[int(right_index)])))
                pairs[key] = max(pairs.get(key, 0.0), 1.0 - float(distance))
        return pairs
