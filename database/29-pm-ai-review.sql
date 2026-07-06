-- PM review layer on supervisor-confirmed AI actions
-- Run after migration 28

ALTER TABLE public.ai_actions
  ADD COLUMN IF NOT EXISTS pm_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (pm_status IN ('not_required', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS pm_reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pm_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pm_rejection_reason TEXT;

-- Backfill: confirmed actions awaiting PM review
UPDATE public.ai_actions
SET pm_status = 'pending'
WHERE status = 'confirmed_by_user'
  AND pm_status = 'not_required'
  AND type IN ('purchase_request', 'subcontractor_instruction', 'hse_alert');
