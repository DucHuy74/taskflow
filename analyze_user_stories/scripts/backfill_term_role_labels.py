"""Backfill :Subject/:Action/:Object role labels on Term nodes from existing PERFORM/TARGET edges.

Safe to re-run: labels are recomputed per workspace (removed, then re-set from current edges).

Usage:
    python scripts/backfill_term_role_labels.py               # all workspaces found on Term nodes
    python scripts/backfill_term_role_labels.py --workspace <id>
    python scripts/backfill_term_role_labels.py --dry-run     # print counts only, no writes
"""

import argparse
import sys
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")
sys.path.insert(0, str(PROJECT_ROOT))

from src.database.neo4j import Neo4jConnection  # noqa: E402
from src.services.neo4j_service import Neo4jService  # noqa: E402


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description="Backfill Term role labels from PERFORM/TARGET edges.")
    parser.add_argument("--workspace", help="Only process this workspace_id")
    parser.add_argument("--dry-run", action="store_true", help="Print current->expected counts without writing")
    return parser.parse_args(argv)


def run(service, workspace=None, dry_run=False):
    workspace_ids = [workspace] if workspace else service.list_term_workspace_ids()
    print(f"Workspaces to process: {len(workspace_ids)}{' (dry run)' if dry_run else ''}")

    for ws in workspace_ids:
        if dry_run:
            stats = service.preview_role_labels(ws) or {}
            print(
                f"  [DRY] workspace={ws} terms={stats.get('terms', 0)} "
                f"subjects={stats.get('current_subjects', 0)}->{stats.get('subjects', 0)} "
                f"actions={stats.get('current_actions', 0)}->{stats.get('actions', 0)} "
                f"objects={stats.get('current_objects', 0)}->{stats.get('objects', 0)}"
            )
        else:
            stats = service.refresh_role_labels(ws) or {}
            print(
                f"  workspace={ws} terms={stats.get('terms', 0)} "
                f"subjects={stats.get('subjects', 0)} actions={stats.get('actions', 0)} "
                f"objects={stats.get('objects', 0)}"
            )
    return workspace_ids


def main(argv=None):
    args = parse_args(argv)
    conn = Neo4jConnection()
    try:
        run(Neo4jService(conn), workspace=args.workspace, dry_run=args.dry_run)
        print("Done.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
