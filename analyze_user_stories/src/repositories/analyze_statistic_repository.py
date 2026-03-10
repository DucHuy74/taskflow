from .base_repository import BaseRepository
from models.analyze_statistic import AnalyzeStatistic

class AnalyzeStatisticRepository(BaseRepository):

    def rebuild_for_sprint(self, session, sprint_id):
        session.query(AnalyzeStatistic).filter(
            AnalyzeStatistic.ast_sprint_id == sprint_id
        ).delete()
        session.commit()
