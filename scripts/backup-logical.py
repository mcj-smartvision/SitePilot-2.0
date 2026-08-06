"""
Logical Supabase/Postgres backup (schema-ish + data) via psycopg2.
Use when local pg_dump is older than the remote server.

Output: backups/backup-<timestamp>.sql
"""
from __future__ import annotations

import pathlib
import re
from datetime import datetime, timezone

import psycopg2
from psycopg2 import sql

root = pathlib.Path(__file__).resolve().parents[1]
env = (root / ".env.local").read_text(encoding="utf-8")
match = re.search(r"^DATABASE_URL=(.+)$", env, re.M)
if not match:
    raise SystemExit("DATABASE_URL missing in .env.local")

db_url = match.group(1).strip()
backup_dir = root / "backups"
backup_dir.mkdir(exist_ok=True)
stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
out_path = backup_dir / f"backup-{stamp}.sql"

SKIP_SCHEMAS = {
    "pg_catalog",
    "information_schema",
    "pg_toast",
}


def literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, memoryview):
        value = bytes(value)
    if isinstance(value, (bytes, bytearray)):
        return r"'\x" + value.hex() + "'"
    text = str(value).replace("'", "''")
    return f"'{text}'"


conn = psycopg2.connect(db_url)
conn.set_session(readonly=True, autocommit=True)
cur = conn.cursor()

cur.execute("SELECT version()")
server_version = cur.fetchone()[0]

cur.execute(
    """
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
      AND table_schema NOT LIKE 'pg_%'
    ORDER BY table_schema, table_name
    """
)
tables = [(s, t) for s, t in cur.fetchall() if s not in SKIP_SCHEMAS]

lines: list[str] = [
    "-- SitePilot / Liparta logical backup",
    f"-- Created: {stamp}Z",
    f"-- Server: {server_version}",
    "-- Note: data + column layout; recreate extensions/policies separately if needed.",
    "BEGIN;",
    "",
]

row_total = 0
for schema, table in tables:
    qname = f'"{schema}"."{table}"'
    print(f"  dumping {qname}…")
    cur.execute(
        sql.SQL("SELECT * FROM {}.{}").format(
            sql.Identifier(schema), sql.Identifier(table)
        )
    )
    cols = [d[0] for d in cur.description]
    rows = cur.fetchall()
    lines.append(f"-- {qname} ({len(rows)} rows)")
    lines.append(f"TRUNCATE TABLE {qname} CASCADE;")
    if not rows:
        lines.append("")
        continue
    col_list = ", ".join(f'"{c}"' for c in cols)
    batch: list[str] = []
    for row in rows:
        values = ", ".join(literal(v) for v in row)
        batch.append(f"({values})")
        row_total += 1
        if len(batch) >= 100:
            lines.append(
                f"INSERT INTO {qname} ({col_list}) VALUES\n  "
                + ",\n  ".join(batch)
                + ";"
            )
            batch = []
    if batch:
        lines.append(
            f"INSERT INTO {qname} ({col_list}) VALUES\n  "
            + ",\n  ".join(batch)
            + ";"
        )
    lines.append("")

lines.append("COMMIT;")
lines.append("")

text = "\n".join(lines)
out_path.write_text(text, encoding="utf-8")
size_mb = out_path.stat().st_size / (1024 * 1024)

cur.close()
conn.close()

print(f"OK tables={len(tables)} rows={row_total} size_mb={size_mb:.2f}")
print(out_path)
