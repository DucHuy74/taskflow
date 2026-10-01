import os
from dotenv import load_dotenv

# Load .env nếu đang chạy local (khi deploy thật thì Aiven / Docker sẽ tự inject env)
load_dotenv()
# URL_CONNECTION_GRAPH_DB = os.environ["URL_CONNECTION_GRAPH_DB"]
# USER_GRAPH_DB = os.environ["USER_GRAPH_DB"]
# PASSWORD_GRAPH_DB = os.environ["PASSWORD_GRAPH_DB"]

MYSQL_HOST = os.environ["MYSQL_HOST"]
MYSQL_PORT = int(os.environ["MYSQL_PORT"])
MYSQL_USERNAME = os.environ["MYSQL_USERNAME"]
MYSQL_PASSWORD = os.environ["MYSQL_PASSWORD"]
MYSQL_DATABASE = os.environ["MYSQL_DATABASE"]


# Kết nối SQLAlchemy
DATABASE_URL = (
    f"mysql+pymysql://{MYSQL_USERNAME}:{MYSQL_PASSWORD}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
)


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


REDUNDANCY_THRESHOLD = _env_float("REDUNDANCY_THRESHOLD", 0.6)
PRIORITY_W_INITIAL = _env_float("PRIORITY_W_INITIAL", 0.5)
PRIORITY_W_SIMILARITY = _env_float("PRIORITY_W_SIMILARITY", 0.3)
PRIORITY_W_RULE = _env_float("PRIORITY_W_RULE", 0.2)
PRIORITY_REDUNDANCY_ALPHA = _env_float("PRIORITY_REDUNDANCY_ALPHA", 0.6)
REDUNDANCY_DEBUG_TOP_K_DEFAULT = _env_int("REDUNDANCY_DEBUG_TOP_K_DEFAULT", 20)
# Số cặp story ghi lên Neo4j (REDUNDANT_WITH) để xem đồ thị — không phụ thuộc threshold phân loại
REDUNDANCY_GRAPH_TOP_K = _env_int("REDUNDANCY_GRAPH_TOP_K", 100)
REDUNDANCY_GRAPH_MIN_SCORE = _env_float("REDUNDANCY_GRAPH_MIN_SCORE", 0.0)
