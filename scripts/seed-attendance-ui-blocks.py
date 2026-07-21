"""Upsert SEC UI blocks into dashboard_ui_blocks."""
from __future__ import annotations

import pathlib
import re

import psycopg2

root = pathlib.Path(__file__).resolve().parents[1]
env = (root / ".env.local").read_text(encoding="utf-8")
match = re.search(r"^DATABASE_URL=(.+)$", env, re.M)
if not match:
    raise SystemExit("DATABASE_URL missing")

rows = [
    ("SEC-KPI-01", "sec.kpi.presence", "kpi", "security", "executive", "خلاصه حضور", "Presence KPIs", "داخل، بیرون، غایب، تردد", None, 710, True),
    ("SEC-ACT-01", "sec.action.gate_log", "action", "security", "operational", "ثبت تردد گیت", "Gate Transit Log", "شناسایی و ثبت ورود/خروج", None, 720, True),
    ("SEC-PNL-02", "sec.panel.live_lists", "panel", "security", "operational", "لیست‌های زنده", "Live Presence Lists", "داخل / بیرون / غایب", None, 730, True),
    ("SEC-TBL-01", "sec.table.transits", "table", "security", "operational", "جدول ترددها", "Transit Log", "همه رویدادهای شناسایی امروز", None, 740, True),
]

sql = """
INSERT INTO public.dashboard_ui_blocks
  (code, key, kind, dashboard, layer, title_fa, title_en, description_fa, legacy_widget_key, sort_order, default_visible)
VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
ON CONFLICT (code) DO UPDATE SET
  key = EXCLUDED.key,
  kind = EXCLUDED.kind,
  dashboard = EXCLUDED.dashboard,
  layer = EXCLUDED.layer,
  title_fa = EXCLUDED.title_fa,
  title_en = EXCLUDED.title_en,
  description_fa = EXCLUDED.description_fa,
  sort_order = EXCLUDED.sort_order,
  default_visible = EXCLUDED.default_visible,
  is_active = true;
"""

conn = psycopg2.connect(match.group(1).strip())
conn.autocommit = True
cur = conn.cursor()
for row in rows:
    cur.execute(sql, row)
cur.execute(
    "UPDATE public.dashboard_ui_blocks SET default_visible = false WHERE code = %s",
    ("SEC-PNL-01",),
)
print("ui-blocks-ok", len(rows))
cur.close()
conn.close()
