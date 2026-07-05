-- =====================================================
-- SitePilot: Preserve MSP baseline dates for schedule rebuild
-- Run after migration 26
-- =====================================================

ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS baseline_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS baseline_finish TIMESTAMPTZ;

COMMENT ON COLUMN public.project_tasks.baseline_start IS 'Original MSP start (never shifted by reschedule)';
COMMENT ON COLUMN public.project_tasks.baseline_finish IS 'Original MSP finish (never shifted by reschedule)';

-- Backfill from planned dates for existing rows
UPDATE public.project_tasks
SET
  baseline_start = COALESCE(baseline_start, start_planned),
  baseline_finish = COALESCE(baseline_finish, finish_planned)
WHERE baseline_start IS NULL OR baseline_finish IS NULL;
