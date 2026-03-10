from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from src.database.dependencies import get_db
from src.models.analyze_story import AnalyzeStory
from src.models.analyze_story_result import AnalyzeStoryResult
from src.services.statistics_service import StatisticsService


router = APIRouter(prefix="/statistics", tags=["Statistics"])

class AssociationRuleGenerateRequest(BaseModel):
    sprint_id: str
    workspace_id: str


@router.post("/association-rule/generate")
def generate_association_rules(
    req: AssociationRuleGenerateRequest,
    db: Session = Depends(get_db)
):

    rows = (
        db.query(AnalyzeStoryResult)
        .join(
            AnalyzeStory,
            AnalyzeStory.as_id == AnalyzeStoryResult.asr_story_id
        )
        .filter(
            AnalyzeStory.as_sprint_id == req.sprint_id,
            AnalyzeStory.as_workspace_id == req.workspace_id,
            AnalyzeStoryResult.asr_is_deleted == False
        )
        .all()
    )

    svo_list = []

    for r in rows:
        svo_list.append({
            "subject": r.asr_subject_canonical or r.asr_subject,
            "action": r.asr_action_canonical or r.asr_action,
            "object": r.asr_object_canonical or r.asr_object
        })

    stats_service = StatisticsService()

    transactions, rules = stats_service.generate_association_rules(
        svo_list
    )

    return {
        "total_svo": len(svo_list),
        "total_transactions": len(transactions),
        "total_rules": len(rules),
        "rules": rules
    }
