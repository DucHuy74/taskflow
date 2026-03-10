from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

class BaseRepository:

    def add(self, session: Session, instance):
        try:
            session.add(instance)
            session.commit()
            session.refresh(instance)
            return instance
        except SQLAlchemyError:
            session.rollback()
            raise

    def get_by_pk(self, session: Session, model, pk_field: str, pk_value):
        return session.query(model).filter(
            getattr(model, pk_field) == pk_value
        ).first()

    def update(self, session: Session, instance, data: dict):
        try:
            for key, value in data.items():
                if hasattr(instance, key):
                    setattr(instance, key, value)

            # auto versioning
            for version_field in ["as_version", "asr_version", "kt_version", "kr_version"]:
                if hasattr(instance, version_field):
                    setattr(instance, version_field, getattr(instance, version_field) + 1)

            session.commit()
            session.refresh(instance)
            return instance
        except SQLAlchemyError:
            session.rollback()
            raise

    def soft_delete(self, session: Session, instance):
        try:
            for field in ["as_is_deleted", "asr_is_deleted", "kt_is_deleted", "kr_is_deleted"]:
                if hasattr(instance, field):
                    setattr(instance, field, True)

            session.commit()
        except SQLAlchemyError:
            session.rollback()
            raise
