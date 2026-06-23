from typing import Optional

from src.services.domain_vocabulary_service import DomainVocabularyService
from src.services.parsing.generic_svo_parser import GenericSvoParser
from src.services.parsing.parse_orchestrator import ParseOrchestrator
from src.services.parsing.standard_parser import StandardParser
from src.services.parsing.w2v_role_assigner import W2vRoleAssigner


class AnalyzeParsingService:

    def __init__(self, nlp, word2Vec, domain_vocab_service: Optional[DomainVocabularyService] = None):
        self.nlp = nlp
        self.word2Vec = word2Vec
        self.domain_vocab_service = domain_vocab_service
        self._orchestrator = ParseOrchestrator(
            standard_parser=StandardParser(nlp),
            generic_parser=GenericSvoParser(nlp),
            w2v_assigner=W2vRoleAssigner(nlp, word2Vec),
            domain_vocab_service=domain_vocab_service,
        )

    def parse(self, raw_text: str, workspace_id: Optional[str] = None) -> dict:
        return self._orchestrator.parse(raw_text, workspace_id=workspace_id)
