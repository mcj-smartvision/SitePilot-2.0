# ADR-002 — Technical Office role on Layer 2

## Status
Accepted

## Context
Site supervisors need a simple daily flow. Quantity gaps and payment readiness belong to **Technical Office** (`مدیر دفتر فنی`), with PM seeing only exceptions.

## Decision
1. Add position key `technical_office` (FA: مدیر دفتر فنی).
2. Map to site-ops role `TECHNICAL_OFFICE`.
3. Extend operational packages with enrichment + light payment flags (not a VO/legal engine).
4. Site remains: today plan / actual / blocker / status only.
5. PM gets exception inbox for `NeedsChangeReview`, `QuantityIncomplete`, and risk acknowledgements.

## Out of scope (MVP)
Full VO/change-order, BOQ certification, warehouse, PTW, security gatehouse, AI quantity invention.
