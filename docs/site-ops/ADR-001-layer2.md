# ADR-001 — Layer 2 Site Ops inside SitePilot

## Status
Accepted (2026-07-18)

## Context
The product brief targets a **Liparta** monorepo with `pnpm cre:phase1` and CRE Phase 1 UI.
This workspace is **SitePilot 2.1** — a single Next.js 14 app (npm, Supabase, no `apps/` / `packages/` workspace).

Repo discovery found:
- No Liparta brand, CRE CLI, or `CONTROL_READY` engine
- Existing MSP XML import under `lib/schedule/` + `/api/schedule/import-msp`
- Role dashboards via `positions.key` + Supabase auth
- SQL migrations in `database/NN-*.sql` (next free number: **44**)

## Decision
1. **Do not invent a CRE Phase 1 engine** in SitePilot. Layer 2 **imports CRE Phase 1 JSON exports** produced externally (Liparta CRE).
2. Place Layer 2 **inside this Next app** (not a fake monorepo):
   - `lib/cre-contract` — zod + types for CRE export
   - `lib/site-ops-domain` — pure rules (promote, plan, actuals, RBAC, report)
   - `lib/site-ops` — Supabase persistence
   - `app/api/site-ops/*` — HTTP API
   - `app/(dashboard)/site-ops/*` — UI
   - `database/44-site-ops-layer2.sql` — schema
3. Keep existing SitePilot schedule/MSP/CRE-unrelated code unchanged.
4. Acceptance criterion `pnpm cre:phase1 still works` is **N/A here** (command does not exist); document operator workflow as external CRE → import JSON.
5. Site-ops RBAC uses dedicated `site_ops_roles` per project member, with bootstrap mapping from SitePilot positions (PM → SITE_MANAGER, supervisor → SUPERVISOR, etc.). System admins get full access.

## Consequences
- Layer 2 is additive; CRE readiness gate remains external.
- E2E demos use JSON fixtures under `data/site-ops/fixtures/`.
- Full Liparta monorepo packaging can be extracted later without changing domain contracts.
