from typing import Optional, Tuple

from src.utils import find_subject, find_verb_object


class StandardParser:
    """Parser for canonical 'As a ..., I want ...' user story structure."""

    def __init__(self, nlp):
        self.nlp = nlp

    def parse(self, raw_text: str) -> dict:
        doc = self.nlp(raw_text.strip())

        tokens_to_exclude = {token.i for token in doc if token.dep_ == "advcl"}
        advcl_tokens = set()

        for token in doc:
            if token.i in tokens_to_exclude:
                for child in token.subtree:
                    tokens_to_exclude.add(child.i)
                    advcl_tokens.add(child.i)

        core_text = "".join(
            t.text_with_ws for t in doc if t.i not in tokens_to_exclude
        ).strip()

        doc_core = self.nlp(core_text)

        subject = find_subject(doc_core)
        verb, object_ = find_verb_object(doc_core)

        if not object_ and advcl_tokens:
            advcl_text = "".join(
                t.text_with_ws for t in doc if t.i in advcl_tokens
            ).strip()
            _, object_ = find_verb_object(self.nlp(advcl_text))

        if not verb:
            return {"status": "ERROR"}

        return {
            "subject": subject,
            "action": verb,
            "object": object_,
            "status": "VALID",
        }
