"""Check attendance tables + storage bucket exist in Supabase."""
from __future__ import annotations

import pathlib
import re

import psycopg2

root = pathlib.Path(__file__).resolve().parents[1]
env = (root / ".env.local").read_text(encoding="utf-8")
match = re.search(r"^DATABASE_URL=(.+)$", env, re.M)
if not match:
    raise SystemExit("DATABASE_URL missing")

conn = psycopg2.connect(match.group(1).strip())
cur = conn.cursor()

cur.execute(
    """
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE 'attendance%'
    ORDER BY 1
    """
)
tables = [r[0] for r in cur.fetchall()]
print("TABLES:", tables)

cur.execute("SELECT id, public FROM storage.buckets WHERE id='attendance-faces'")
bucket = cur.fetchall()
print("BUCKET:", bucket if bucket else "MISSING")

for t in [
    "attendance_gates",
    "attendance_transits",
    "attendance_enrollments",
    "attendance_email_log",
]:
    try:
        cur.execute(f"SELECT count(*) FROM {t}")
        print(f"{t}: {cur.fetchone()[0]}")
    except Exception as e:
        conn.rollback()
        print(f"{t}: MISSING ({e})")

cur.close()
conn.close()
