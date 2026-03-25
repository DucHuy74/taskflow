from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import List
from sqlalchemy.orm import Session

from src.database import db
from src.database.dependencies import get_db
from src.utils.model_loader import load_models

from src.services.analyze_parsing_service import AnalyzeParsingService
from src.services.semantic_normalization_service import SemanticNormalizationService
from src.services.analyze_coordinator_service import AnalyzeCoordinatorService
from src.services.analyze_persistence_service import AnalyzePersistenceService
from src.services.statistics_service import StatisticsService
from src.services.similarity_factory import build_similarity_calculator

router = APIRouter(prefix="/analyze", tags=["Analyze"])

nlp, word2Vec = load_models()

similarity_calculator = build_similarity_calculator(word2Vec)

parser_service = AnalyzeParsingService(nlp, word2Vec)
semantic_service = SemanticNormalizationService(similarity_calculator)
statistics_service = StatisticsService()

## Request models
class ParseRequest(BaseModel):
    text: str


class LearnRequest(BaseModel):
    texts: List[str]


class ReceiveUserStoryRequest(BaseModel):
    user_story_id: str = Field(alias="userStoryId")
    
    
    
    
## Learn
@router.post("/learn")
def learn_user_stories(req: LearnRequest, db: Session = Depends(get_db)):

    if not req.texts:
        return {"error": "texts cannot be empty"}

    persistence_service = AnalyzePersistenceService(db)

    coordinator = AnalyzeCoordinatorService(
        parser_service,
        semantic_service,
        statistics_service,
        persistence_service
    )

    return coordinator.analyze_and_save(
        texts=req.texts,
        sprint_id="SPRINT_1",
        workspace_id="WS_1",
        creator_id="USER_1"
    )