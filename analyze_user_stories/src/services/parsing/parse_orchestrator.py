from typing import Optional


def is_complete_svo(result: dict) -> bool:
    if result.get("status") == "ERROR":
        return False
    return bool(result.get("action") and result.get("object"))


class ParseOrchestrator:
    """Try standard parser first, then generic SVO, then Word2Vec role assignment."""

    def __init__(self, standard_parser, generic_parser, w2v_assigner, domain_vocab_service=None):
        self.standard = standard_parser
        self.generic = generic_parser
        self.w2v_assigner = w2v_assigner
        self.domain_vocab_service = domain_vocab_service

    def parse(self, raw_text: str, workspace_id: Optional[str] = None) -> dict:
        result = self.standard.parse(raw_text)
        if is_complete_svo(result) and result.get("subject"):
            return {
                **result,
                "parse_method": "standard",
                "confidence": 1.0,
            }

        result = self.generic.parse(raw_text)
        if is_complete_svo(result):
            return {
                **result,
                "parse_method": "generic",
                "confidence": 0.8,
            }

        domain_vocab = None
        if self.domain_vocab_service and workspace_id:
            domain_vocab = self.domain_vocab_service.get_vocabulary(workspace_id)

        result = self.w2v_assigner.parse(raw_text, domain_vocab)
        if result.get("status") == "ERROR":
            return {
                "status": "ERROR",
                "parse_method": "w2v_corpus",
                "confidence": 0.0,
            }

        return {
            **result,
            "parse_method": "w2v_corpus",
            "confidence": result.get("confidence", 0.5),
        }
