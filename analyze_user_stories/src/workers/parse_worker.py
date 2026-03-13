import time
from src.database.db import db_manager

from src.services.analyze_parsing_service import AnalyzeParsingService
from src.services.knowledge_learning_service import KnowledgeLearningService
from src.services.statistics_service import StatisticsService
from src.services.analyze_persistence_service import AnalyzePersistenceService
from src.services.analyze_coordinator_service import AnalyzeCoordinatorService
from src.utils.model_loader import load_models
from src.services.similarity_factory import build_similarity_calculator


nlp, word2Vec = load_models()

similarity_calculator = build_similarity_calculator(word2Vec)

parser_service = AnalyzeParsingService(nlp, word2Vec)
knowledge_service = KnowledgeLearningService(similarity_calculator)
statistics_service = StatisticsService()

## 5 giây quét DB 1 lần
def run_worker():

    while True:

        db = next(db_manager.get_session())

        try:

            persistence = AnalyzePersistenceService(db)

            coordinator = AnalyzeCoordinatorService(
                parser_service,
                knowledge_service,
                statistics_service,
                persistence
            )

            result = coordinator.parse_pending_stories()

            if result:
                print("Parsed stories:", result)

        finally:
            db.close()

        time.sleep(5)