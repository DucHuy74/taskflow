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


def _env_score(name: str, default: float) -> float:
    value = _env_float(name, default)
    if not 0.0 <= value <= 1.0:
        raise ValueError(f"{name} must be between 0 and 1, got {value}")
    return value


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ValueError(f"{name} must be a boolean, got {raw}")


SEMANTIC_AUTO_MERGE_THRESHOLD = _env_score("SEMANTIC_AUTO_MERGE_THRESHOLD", 0.75)
SEMANTIC_REVIEW_THRESHOLD = _env_score("SEMANTIC_REVIEW_THRESHOLD", 0.60)
SEMANTIC_CONTEXT_THRESHOLD = _env_score("SEMANTIC_CONTEXT_THRESHOLD", 0.50)
REDUNDANCY_THRESHOLD = _env_score("REDUNDANCY_THRESHOLD", 0.65)
REDUNDANCY_HIGH_THRESHOLD = _env_score("REDUNDANCY_HIGH_THRESHOLD", 0.85)
REDUNDANCY_SEMANTIC_HIGH_THRESHOLD = _env_score("REDUNDANCY_SEMANTIC_HIGH_THRESHOLD", 0.80)
REDUNDANCY_W_SEMANTIC = _env_score("REDUNDANCY_W_SEMANTIC", 0.60)
REDUNDANCY_W_ACTION = _env_score("REDUNDANCY_W_ACTION", 0.15)
REDUNDANCY_W_OBJECT = _env_score("REDUNDANCY_W_OBJECT", 0.15)
REDUNDANCY_W_SUBJECT = _env_score("REDUNDANCY_W_SUBJECT", 0.05)
REDUNDANCY_W_TOKEN = _env_score("REDUNDANCY_W_TOKEN", 0.05)
PRIORITY_W_INITIAL = _env_score("PRIORITY_W_INITIAL", 0.5)
PRIORITY_W_SIMILARITY = _env_score("PRIORITY_W_SIMILARITY", 0.3)
PRIORITY_W_RULE = _env_score("PRIORITY_W_RULE", 0.2)
REDUNDANCY_DEBUG_TOP_K_DEFAULT = _env_int("REDUNDANCY_DEBUG_TOP_K_DEFAULT", 20)
# Số cặp story ghi lên Neo4j (REDUNDANT_WITH) để xem đồ thị — không phụ thuộc threshold phân loại
REDUNDANCY_GRAPH_TOP_K = _env_int("REDUNDANCY_GRAPH_TOP_K", 100)
REDUNDANCY_GRAPH_MIN_SCORE = _env_score("REDUNDANCY_GRAPH_MIN_SCORE", 0.0)
RECOMMENDATION_POLICY_VERSION = os.getenv("RECOMMENDATION_POLICY_VERSION", "deterministic-v1")
RECOMMENDATION_MODEL_VERSION = os.getenv("RECOMMENDATION_MODEL_VERSION", "heuristic-v1")
RECOMMENDATION_EMBEDDINGS_ENABLED = _env_bool("RECOMMENDATION_EMBEDDINGS_ENABLED", False)
RECOMMENDATION_TOP_K = _env_int("RECOMMENDATION_TOP_K", 20)
if REDUNDANCY_GRAPH_TOP_K <= 0 or RECOMMENDATION_TOP_K <= 0:
    raise ValueError("REDUNDANCY_GRAPH_TOP_K and RECOMMENDATION_TOP_K must be positive")

_redundancy_weight_sum = sum((
    REDUNDANCY_W_SEMANTIC,
    REDUNDANCY_W_ACTION,
    REDUNDANCY_W_OBJECT,
    REDUNDANCY_W_SUBJECT,
    REDUNDANCY_W_TOKEN,
))
if abs(_redundancy_weight_sum - 1.0) > 1e-9:
    raise ValueError(f"Redundancy weights must sum to 1.0, got {_redundancy_weight_sum}")
if REDUNDANCY_HIGH_THRESHOLD < REDUNDANCY_THRESHOLD:
    raise ValueError("REDUNDANCY_HIGH_THRESHOLD must be >= REDUNDANCY_THRESHOLD")
