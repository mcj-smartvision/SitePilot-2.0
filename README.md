# Liparta

Control Readiness & Site Operations (Next.js + Supabase).  
*Integrity before Intelligence.*

## Layer 2 architecture & how it depends on CRE

**CRE Phase 1** = readiness gate for schedule control data (external Liparta product).  
**Layer 2 (Site Ops)** = site operations system for daily execution (hosted in this app).

- No daily control plan exists in Phase 1.
- Layer 2 begins only after readiness (**CONTROL_READY**) or an **audited override**.
- This repo does **not** contain `pnpm cre:phase1`. Run CRE externally, then import the JSON export into Site Ops.

### Operator workflow
1. Fix schedule findings in MSP/source  
2. Rerun CRE Phase 1 externally (`pnpm cre:phase1` in the Liparta monorepo)  
3. Import run JSON in SitePilot → `/site-ops/cre-runs`  
4. Promote READY tasks (or force-promote with reason)  
5. Issue daily plan  
6. Capture actuals (approve/reject)  
7. Close day & open daily report (`/site-ops/reports/daily`)

### Local commands
```bash
npm run dev
npx tsx scripts/test-site-ops-domain.ts
```

Apply SQL (Supabase SQL Editor, in order):
- `database/43-internal-messaging.sql` (if not yet applied)
- `database/44-site-ops-layer2.sql`

Docs: `docs/site-ops/ADR-001-layer2.md`
