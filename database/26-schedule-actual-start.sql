-- =====================================================
-- SitePilot: Schedule actual start + baseline tracking
-- Run in Supabase SQL Editor after migration 25
-- =====================================================

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS schedule_baseline_start DATE,
  ADD COLUMN IF NOT EXISTS schedule_actual_start DATE,
  ADD COLUMN IF NOT EXISTS schedule_start_aligned BOOLEAN;

COMMENT ON COLUMN public.projects.schedule_baseline_start IS 'Earliest task start from imported MSP baseline';
COMMENT ON COLUMN public.projects.schedule_actual_start IS 'User-confirmed actual project/site start date';
COMMENT ON COLUMN public.projects.schedule_start_aligned IS 'True if actual start matches MSP baseline';
