from typing import Dict, Optional, Set


DEFAULT_SUBJECTS = {"user", "admin", "customer", "manager"}
DEFAULT_ACTIONS = {"create", "update", "delete", "view", "manage", "reset", "login", "access"}
DEFAULT_OBJECTS = {"account", "password", "order", "product", "profile", "dashboard"}


class W2vRoleAssigner:
    """Assign SVO roles via POS extraction + Word2Vec similarity against domain vocabulary."""

    def __init__(self, nlp, word2vec):
        self.nlp = nlp
        self.word2vec = word2vec

    def parse(self, raw_text: str, domain_vocab: Optional[Dict[str, Set[str]]] = None) -> dict:
        vocab = domain_vocab or {}
        subjects = vocab.get("subjects") or DEFAULT_SUBJECTS
        actions = vocab.get("actions") or DEFAULT_ACTIONS
        objects = vocab.get("objects") or DEFAULT_OBJECTS

        doc = self.nlp(raw_text.strip())
        nouns = [t.lemma_.lower() for t in doc if t.pos_ in ("NOUN", "PROPN")]
        verbs = [t.lemma_.lower() for t in doc if t.pos_ == "VERB"]

        subject = self._best_match(nouns, subjects) or (nouns[0] if nouns else None)
        action = self._best_match(verbs, actions) or (verbs[0] if verbs else None)
        obj = self._best_match(nouns, objects) or (nouns[-1] if nouns else None)

        if obj and subject and obj == subject and len(nouns) > 1:
            obj = nouns[-1]

        if not action and not obj:
            return {"status": "ERROR", "confidence": 0.0}

        confidence = self._compute_confidence(subject, action, obj, subjects, actions, objects)

        return {
            "subject": subject,
            "action": action,
            "object": obj,
            "status": "VALID",
            "confidence": confidence,
        }

    def _w2v_similarity(self, w1: str, w2: str) -> float:
        if not w1 or not w2:
            return 0.0
        if w1 == w2:
            return 1.0
        if w1 not in self.word2vec or w2 not in self.word2vec:
            return 0.0
        try:
            return float(self.word2vec.similarity(w1, w2))
        except Exception:
            return 0.0

    def _best_match(self, candidates, vocabulary: Set[str]) -> Optional[str]:
        if not candidates or not vocabulary:
            return None

        best_word = None
        best_score = 0.3

        for candidate in candidates:
            for vocab_word in vocabulary:
                score = self._w2v_similarity(candidate, vocab_word)
                if score > best_score:
                    best_score = score
                    best_word = candidate

        return best_word

    def _compute_confidence(
        self,
        subject,
        action,
        obj,
        subjects,
        actions,
        objects,
    ) -> float:
        scores = []
        if subject:
            scores.append(max((self._w2v_similarity(subject, s) for s in subjects), default=0.3))
        if action:
            scores.append(max((self._w2v_similarity(action, a) for a in actions), default=0.3))
        if obj:
            scores.append(max((self._w2v_similarity(obj, o) for o in objects), default=0.3))

        if not scores:
            return 0.3
        return round(min(max(sum(scores) / len(scores), 0.3), 0.9), 2)
