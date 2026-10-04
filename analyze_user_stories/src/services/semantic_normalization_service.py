import logging

from constant import (
    SEMANTIC_AUTO_MERGE_THRESHOLD,
    SEMANTIC_CONTEXT_THRESHOLD,
    SEMANTIC_REVIEW_THRESHOLD,
)


logger = logging.getLogger(__name__)


class SemanticNormalizationService:
    """Normalize SVO terms while retaining every computed similarity as evidence."""

    def __init__(self, similarity_calculator):
        self.similarity_calculator = similarity_calculator

    def process(self, svo_list):
        valid_svo, error_svo = self._split_svo(svo_list)
        similarity_results = self._compute_similarity(valid_svo)
        auto_merge, ambiguous = self._classify_similarity(similarity_results)
        canonical_map = self._build_canonical(auto_merge)
        return {
            "valid_svo": valid_svo,
            "error_svo": error_svo,
            "similarity_results": similarity_results,
            "auto_merge": auto_merge,
            "ambiguous": ambiguous,
            "canonical_map": canonical_map,
            "frequency": self._analyze_frequency(valid_svo, canonical_map),
        }

    @staticmethod
    def _split_svo(svo_list):
        valid = [item for item in svo_list if item.get("status") == "VALID"]
        error = [item for item in svo_list if item.get("status") != "VALID"]
        return valid, error

    def _compute_similarity(self, valid_svo):
        # Action context is its objects; object context is its actions. Comparing both
        # prevents object_similarity from silently collapsing to zero downstream.
        contexts = {"ACTION": {}, "OBJECT": {}}
        for item in valid_svo:
            action = (item.get("action") or "").strip().lower()
            object_name = (item.get("object") or "").strip().lower()
            if action:
                contexts["ACTION"].setdefault(action, set())
                if object_name:
                    contexts["ACTION"][action].add(object_name)
            if object_name:
                contexts["OBJECT"].setdefault(object_name, set())
                if action:
                    contexts["OBJECT"][object_name].add(action)

        results = []
        for term_type, context_map in contexts.items():
            terms = sorted(context_map)
            for index, left in enumerate(terms):
                for right in terms[index + 1:]:
                    try:
                        similarity = float(self.similarity_calculator.calculate(
                            left, right, beta1=5.0, beta2=1.3, bias_b=-2.0
                        ))
                    except (KeyError, TypeError, ValueError, ZeroDivisionError) as exc:
                        logger.warning(
                            "semantic_similarity_failed",
                            extra={"left": left, "right": right, "term_type": term_type, "error": str(exc)},
                        )
                        continue

                    left_context = context_map[left]
                    right_context = context_map[right]
                    union = left_context | right_context
                    context_score = len(left_context & right_context) / len(union) if union else 0.0
                    results.append({
                        "w1": left,
                        "w2": right,
                        "term_type": term_type,
                        "similarity": max(0.0, min(similarity, 1.0)),
                        "context_score": context_score,
                    })
        return results

    @staticmethod
    def _classify_similarity(similarity_results):
        auto_merge = []
        ambiguous = []
        for item in similarity_results:
            similarity = item["similarity"]
            context_score = item["context_score"]
            if similarity >= SEMANTIC_AUTO_MERGE_THRESHOLD and context_score >= SEMANTIC_CONTEXT_THRESHOLD:
                auto_merge.append(item)
            elif similarity >= SEMANTIC_REVIEW_THRESHOLD:
                ambiguous.append(item)
        return auto_merge, ambiguous

    @staticmethod
    def _build_canonical(auto_merge):
        parent = {}

        def find(value):
            parent.setdefault(value, value)
            if parent[value] != value:
                parent[value] = find(parent[value])
            return parent[value]

        def union(left, right):
            left_root = find(left)
            right_root = find(right)
            if left_root != right_root:
                root = min(left_root, right_root, key=lambda value: (len(value), value))
                parent[left_root] = root
                parent[right_root] = root

        # Keep action and object equivalence classes separate.
        for term_type in ("ACTION", "OBJECT"):
            for item in (candidate for candidate in auto_merge if candidate.get("term_type") == term_type):
                union(f"{term_type}:{item['w1']}", f"{term_type}:{item['w2']}")

        canonical = {}
        for typed_term in parent:
            _, term = typed_term.split(":", 1)
            _, root = find(typed_term).split(":", 1)
            canonical[term] = root
        return canonical

    @staticmethod
    def _analyze_frequency(valid_svo, canonical_map):
        frequency = {}
        for item in valid_svo:
            object_name = (item.get("object") or "").lower()
            if object_name:
                canonical = canonical_map.get(object_name, object_name)
                frequency[canonical] = frequency.get(canonical, 0) + 1
        return frequency
