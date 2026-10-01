from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

SLAVE_DATABASE_URL = (
    f"mysql+pymysql://{os.environ['MYSQL_SLAVE_USERNAME']}:"
    f"{os.environ['MYSQL_SLAVE_PASSWORD']}@"
    f"{os.environ['MYSQL_SLAVE_HOST']}:"
    f"{os.environ['MYSQL_SLAVE_PORT']}/"
    f"{os.environ['MYSQL_SLAVE_DATABASE']}"
)

engine_slave = create_engine(SLAVE_DATABASE_URL)
SessionSlave = sessionmaker(bind=engine_slave)

def get_slave_db():
    db = SessionSlave()
    try:
        yield db
    finally:
        db.close()