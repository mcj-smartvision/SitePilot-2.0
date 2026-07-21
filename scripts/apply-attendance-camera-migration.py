"""Apply database/53-attendance-camera-enroll.sql"""
from __future__ import annotations

import pathlib
import re

import psycopg2

root = pathlib.Path(__file__).resolve().parents[1]
env = (root / ".env.local").read_text(encoding="utf-8")
match = re.search(r"^DATABASE_URL=(.+)$", env, re.M)
if not match:
    raise SystemExit("DATABASE_URL missing")

sql = (root / "database" / "53-attendance-camera-enroll.sql").read_text(encoding="utf-8")
conn = psycopg2.connect(match.group(1).strip())
conn.autocommit = True
cur = conn.cursor()
cur.execute(sql)
cur.execute("SELECT count(*) FROM attendance_enrollments")
print("migration-53-ok enrollments=", cur.fetchone()[0])
cur.close()
conn.close()
