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
]


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

        conn.commit()
        print("Migrations applied successfully.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
