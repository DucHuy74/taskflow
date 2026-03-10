from .base_repository import BaseRepository
from models.knowledge_term import KnowledgeTerm

class KnowledgeTermRepository(BaseRepository):

    def get_by_canonical(self, session, canonical, term_type, workspace_id):
        return session.query(KnowledgeTerm).filter(
            KnowledgeTerm.kt_canonical == canonical,
            KnowledgeTerm.kt_type == term_type,
            KnowledgeTerm.kt_workspace_id == workspace_id,
            KnowledgeTerm.kt_is_deleted == False
        ).first()

    def upsert(self, session, term: KnowledgeTerm):
        existing = self.get_by_canonical(
            session,
            term.kt_canonical,
            term.kt_type,
            term.kt_workspace_id
        )

        if existing:
            existing.kt_version += 1
            session.commit()
            return existing

        session.add(term)
        session.commit()
        return term
