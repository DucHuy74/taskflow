from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from fastapi import Depends
from sqlalchemy.orm import Session
from src.database.dependencies import get_db


from src.services.analyze_parsing_service import AnalyzeParsingService
from src.services.knowledge_learning_service import KnowledgeLearningService
from src.utils.model_loader import load_models
from src.services.analyze_coordinator_service import AnalyzeCoordinatorService
from src.services.analyze_persistence_service import AnalyzePersistenceService
from src.services.statistics_service import StatisticsService


from experiment.similatiryStrategies import (
    Calc_wordnet_similarity,
    Calc_w2v_similarity,
    Calculate_nonlinear_fusion
)

router = APIRouter(prefix="/analyze", tags=["Analyze"])

nlp, word2Vec = load_models()



def build_similarity_calculator(word2Vec):

    calc_wordnet_similarity = Calc_wordnet_similarity()
    calc_w2v_similarity = Calc_w2v_similarity(word2Vec)

    return Calculate_nonlinear_fusion(
        word2Vec,
        calc_wordnet_similarity,
        calc_w2v_similarity
    )


similarity_calculator = build_similarity_calculator(word2Vec)


parser_service = AnalyzeParsingService(nlp, word2Vec)
knowledge_service = KnowledgeLearningService(similarity_calculator)
statistics_service = StatisticsService()



class ParseRequest(BaseModel):
    text: str


class LearnRequest(BaseModel):
    texts: List[str]


@router.post("/parse")
def parse_user_story(req: ParseRequest):

    result = parser_service.parse(req.text)

    return {
        "input": req.text,
        "result": result
    }


@router.post("/learn")
def learn_user_stories(req: LearnRequest, db: Session = Depends(get_db)):

    if not req.texts:
        return {"error": "texts cannot be empty"}

    persistence_service = AnalyzePersistenceService(db)

    coordinator = AnalyzeCoordinatorService(
        parser_service,
        knowledge_service,
        statistics_service,
        persistence_service
    )

    result = coordinator.analyze_and_save(
        texts=req.texts,
        sprint_id="SPRINT_1",
        workspace_id="WS_1",
        creator_id="USER_1"
    )

    return result




