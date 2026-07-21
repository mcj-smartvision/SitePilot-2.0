"""Apply database/54-member-contact-email.sql"""
from __future__ import annotations

import pathlib
import re

import psycopg2

root = pathlib.Path(__file__).resolve().parents[1]
env = (root / ".env.local").read_text(encoding="utf-8")
match = re.search(r"^DATABASE_URL=(.+)$", env, re.M)
if not match:
    raise SystemExit("DATABASE_URL missing")

sql = (root / "database" / "54-member-contact-email.sql").read_text(encoding="utf-8")
conn = psycopg2.connect(match.group(1).strip())
conn.autocommit = True
cur = conn.cursor()
cur.execute(sql)
cur.execute(
    "SELECT column_name FROM information_schema.columns "
    "WHERE table_name='profiles' AND column_name='contact_email'"
)
print("migration-54-ok", cur.fetchone())
cur.close()
conn.close()
