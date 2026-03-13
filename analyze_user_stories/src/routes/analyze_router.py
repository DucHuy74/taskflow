from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import List
from sqlalchemy.orm import Session

from src.database import db
from src.database.dependencies import get_db
from src.utils.model_loader import load_models

from src.models.analyze_story import AnalyzeStory
from src.services.analyze_parsing_service import AnalyzeParsingService
from src.services.knowledge_learning_service import KnowledgeLearningService
from src.services.analyze_coordinator_service import AnalyzeCoordinatorService
from src.services.analyze_persistence_service import AnalyzePersistenceService
from src.services.statistics_service import StatisticsService
from src.services.story_client_service import StoryClientService
from src.services.similarity_factory import build_similarity_calculator

router = APIRouter(prefix="/analyze", tags=["Analyze"])

nlp, word2Vec = load_models()

similarity_calculator = build_similarity_calculator(word2Vec)

parser_service = AnalyzeParsingService(nlp, word2Vec)
knowledge_service = KnowledgeLearningService(similarity_calculator)
statistics_service = StatisticsService()
story_client = StoryClientService()

## Request models
class ParseRequest(BaseModel):
    text: str


class LearnRequest(BaseModel):
    texts: List[str]


class ReceiveUserStoryRequest(BaseModel):
    user_story_id: str = Field(alias="userStoryId")
    
    
    
## Receive story API
@router.post("/receive-story")
def receive_user_story(
    req: ReceiveUserStoryRequest,
    db: Session = Depends(get_db)
):

    story_data = story_client.fetch_story(req.user_story_id)

    story = AnalyzeStory(
        as_user_story_id=story_data["id"],
        as_workspace_id=story_data["workspaceId"],
        as_backlog_id=story_data["backlogId"],
        as_sprint_id=story_data["sprintId"],
        as_raw_text=story_data["storyText"],
        as_status="RECEIVED"
    )

    db.add(story)
    db.commit()
    db.refresh(story)

    return {
        "status": "stored",
        "analyzeStoryId": story.as_id
    }
    
    
    
## Parse story
@router.post("/parse/{story_id}")
def parse_user_story(story_id: str, db: Session = Depends(get_db)):

    persistence = AnalyzePersistenceService(db)

    coordinator = AnalyzeCoordinatorService(
        parser_service,
        knowledge_service,
        statistics_service,
        persistence
    )

    result = coordinator.parse_and_save(story_id)

    return {
        "story_id": story_id,
        "result": result
    }


@router.post("/parse-pending")
def parse_pending(db: Session = Depends(get_db)):

    persistence = AnalyzePersistenceService(db)

    coordinator = AnalyzeCoordinatorService(
        parser_service,
        knowledge_service,
        statistics_service,
        persistence
    )

    result = coordinator.parse_pending_stories()

    return {
        "parsed": result
    }
    
    
## Learn
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

    return coordinator.analyze_and_save(
        texts=req.texts,
        sprint_id="SPRINT_1",
        workspace_id="WS_1",
        creator_id="USER_1"
    )