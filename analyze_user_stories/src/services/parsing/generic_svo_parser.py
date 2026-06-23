from typing import Optional, Tuple


class GenericSvoParser:
    """Fallback spaCy dependency parser without requiring 'As a / I want' structure."""

    def __init__(self, nlp):
        self.nlp = nlp

    def parse(self, raw_text: str) -> dict:
        doc = self.nlp(raw_text.strip())
        subject = self._find_subject(doc)
        action, obj = self._find_verb_object(doc)

        if not action and not obj:
            return {"status": "ERROR"}

        return {
            "subject": subject,
            "action": action,
            "object": obj,
            "status": "VALID",
        }

    def _find_subject(self, doc) -> Optional[str]:
        for token in doc:
            if token.dep_ in ("nsubj", "nsubjpass"):
                return token.lemma_.lower()

        for token in doc:
            if token.dep_ == "pobj" and token.head.lemma_.lower() == "as":
                return token.lemma_.lower()

        for token in doc:
            if token.pos_ in ("NOUN", "PROPN") and token.dep_ not in ("dobj", "pobj", "attr"):
                return token.lemma_.lower()

        return None

    def _find_verb_object(self, doc) -> Tuple[Optional[str], Optional[str]]:
        main_verb = None
        for token in doc:
            if token.dep_ == "ROOT" and token.pos_ in ("VERB", "AUX"):
                main_verb = token
                break

        if not main_verb:
            for token in doc:
                if token.pos_ == "VERB":
                    main_verb = token
                    break

        if not main_verb:
            return None, None

        true_verb = None
        for child in main_verb.children:
            if child.dep_ in ("xcomp", "ccomp") and child.pos_ == "VERB":
                true_verb = child
                break

        verb_token = true_verb if true_verb else main_verb
        verb = verb_token.lemma_.lower()
        obj = self._find_object(verb_token)

        if not obj:
            obj = self._find_object(main_verb)

        return verb, obj

    def _find_object(self, verb_token) -> Optional[str]:
        for child in verb_token.children:
            if child.dep_ in ("dobj", "obj", "attr"):
                return child.lemma_.lower()

            if child.dep_ == "prep":
                for prep_child in child.children:
                    if prep_child.dep_ == "pobj":
                        return prep_child.lemma_.lower()

        return None
