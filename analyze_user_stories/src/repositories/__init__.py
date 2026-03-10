from models.base import Base

from models.analyze_story import AnalyzeStory
from models.analyze_story_result import AnalyzeStoryResult
from models.knowledge_term import KnowledgeTerm
from models.knowledge_relation import KnowledgeRelation
from models.analyze_statistic import AnalyzeStatistic
# from sqlalchemy.orm import Session
# from sqlalchemy.exc import SQLAlchemyError

# class BaseRepository:
#     def add(self, session: Session, instance):
#         try:
#             session.add(instance)
#             session.commit()
#             session.refresh(instance)
#             return instance
#         except SQLAlchemyError as e:
#             session.rollback()
#             raise e 
        
#     def getById(self, session: Session, model, id):
#         return session.query(model).get(id)
    
#     def delete(self, session: Session, instance):
#         try:
#             session.delete(instance)
#             session.commit()
#         except SQLAlchemyError as e:
#             session.rollback()
#             raise e
        
#     def update(self, session: Session, model, record_id: str, data: dict):
#         try:
#             instance = session.query(model).filter(model.id == record_id).first()

#             for key, value in data.items():
#                 if hasattr(model, key):
#                     setattr(instance, key, value)

#             session.commit()
#             session.refresh(instance)
#             return instance

#         except SQLAlchemyError as e:
#             session.rollback()
#             raise e

__all__ = [
    "Base",
    "AnalyzeStory",
    "AnalyzeStoryResult",
    "KnowledgeTerm",
    "KnowledgeRelation",
    "AnalyzeStatistic",
]