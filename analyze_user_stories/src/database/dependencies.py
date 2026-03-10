from typing import Generator
from sqlalchemy.orm import Session
from src.database.db import db_manager

def get_db() -> Generator[Session, None, None]:
    yield from db_manager.get_session()
