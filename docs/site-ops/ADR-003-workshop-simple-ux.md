# ADR-003 — Simple workshop UX over immutable MSP

## Decision
Primary Layer 2 experience is Excel/MSP-like:
schedule tree → add operational child → PM approve → send to today → actual.

MSP/`project_tasks` remain read-only from workshop UI.
Operational data: `workshop_packages`, `workshop_daily_assignments`, `workshop_actual_entries`, `workshop_review_flags`, `workshop_approval_events`.

### Approval gate
- New packages start as `draft` and stay editable (`draft` / `rejected`).
- Technical Office submits → `pending_approval`.
- PM approves/rejects (with comment) in `/site-ops/approvals`.
- After `approved`, content is locked; edits go through `change_requested` + PM decide.
- Only approved packages can be sent to today.
- Site supervisor views prepared lists at `/site-ops/prepared` (TO content + PM approval status + editable discussion comments).
- Discussion comments: `workshop_package_comments` (author can edit later; visible to project members).

CRE / Technical Office advanced tools never gate field entry before submit.
