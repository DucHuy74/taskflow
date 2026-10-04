"""Apply SQL migrations from migrations/ folder. Safe to re-run (skips existing columns)."""

from pathlib import Path

import pymysql
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import os

MIGRATIONS = [
    (
        "001_add_parse_metadata",
        [
            (
                "asr_parse_method",
                "ALTER TABLE analyze_story_results ADD COLUMN asr_parse_method VARCHAR(30) NULL",
            ),
            (
                "asr_confidence",
                "ALTER TABLE analyze_story_results ADD COLUMN asr_confidence DOUBLE NULL",
            ),
        ],
    ),
    (
        "002_add_backlog_context",
        [
            (
                "asr_backlog_id",
                "ALTER TABLE analyze_story_results ADD COLUMN asr_backlog_id VARCHAR(36) NULL",
            ),
        ],
    ),
]

CREATE_STORY_EMBEDDINGS = """
CREATE TABLE IF NOT EXISTS story_embeddings (
    id VARCHAR(36) PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    story_id VARCHAR(36) NOT NULL,
    content_fingerprint VARCHAR(64) NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    vector LONGBLOB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_story_embedding_revision
        UNIQUE (workspace_id, story_id, content_fingerprint, model_version),
    INDEX idx_story_embedding_workspace (workspace_id),
    INDEX idx_story_embedding_story (story_id)
)
"""


def main():
    conn = pymysql.connect(
        host=os.environ["MYSQL_HOST"],
        port=int(os.environ["MYSQL_PORT"]),
        user=os.environ["MYSQL_USERNAME"],
        password=os.environ["MYSQL_PASSWORD"],
        database=os.environ["MYSQL_DATABASE"],
    )

    try:
        with conn.cursor() as cur:
            cur.execute("SHOW COLUMNS FROM analyze_story_results")
            existing = {row[0] for row in cur.fetchall()}
            print(f"Table analyze_story_results: {len(existing)} columns")

            for migration_name, columns in MIGRATIONS:
                print(f"Migration {migration_name}:")
                for col_name, ddl in columns:
                    if col_name in existing:
                        print(f"  skip {col_name} (already exists)")
                        continue
                    cur.execute(ddl)
                    existing.add(col_name)
                    print(f"  added {col_name}")

            cur.execute(CREATE_STORY_EMBEDDINGS)
            print("Migration 003_create_story_embeddings: ensured table exists")

        conn.commit()
        print("Migrations applied successfully.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
