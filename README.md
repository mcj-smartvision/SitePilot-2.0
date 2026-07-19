# Liparta (لیبارتا)

Control Readiness & Site Operations (Next.js + Supabase).  
*Integrity before Intelligence.*

## Workshop user flow (Layer 2 — primary)

Field path (Persian UI, under 60 seconds):

1. Open `/site-ops` → lands on **برنامه**
2. Select a schedule row (from imported MSP — immutable)
3. **+ زیرمجموعه** (name, qty, UOM; optional location/crew/flag)
4. **ارسال به امروز** → **امروز** → ثبت عملکرد (done / partial / blocked)

Primary nav: `برنامه` · `امروز` · `پرچم‌ها`  
Advanced (hidden): CRE runs, old daily plans, Technical Office, Exceptions.

### Why MSP is immutable
MSP/`project_tasks` is the baseline snapshot. Workshop children live in `workshop_packages` linked by `project_task_id` — never rewrite source WBS for daily ops.

### How flags replace heavy change-request UX
Out-of-list or unclear work: still save + optional `flag_for_review`. Appears in **پرچم‌ها** for Technical Office later. Does **not** block actual entry. No VO ceremony in the main path.

### Demo: شمشه‌گیری گچ under WBS 10.1
1. Run SQL `database/46-workshop-ops-simple.sql`
2. Ensure vegas (or project) has MSP imported (Admin → Schedule)
3. Find row WBS `10.1` / name containing گچ و خاک…
4. Add child: `اجرای شمشه‌گیری گچ` · محل `واحد 201` · `120` · `m2` · گروه `گچ‌کار`
5. Send to today `30` → actual `25` status `partial`

## CRE Phase 1 (advanced / separate)
Readiness gate only (`CONTROL_READY` / `NOT_CONTROL_READY`). Not required for workshop entry. Routes under «ابزار پیشرفته».

## SQL order
`43` → `44` → `45` → **`46-workshop-ops-simple.sql`**

## Commands
```bash
npm run dev
npm run test:workshop
npm run test:site-ops
```
