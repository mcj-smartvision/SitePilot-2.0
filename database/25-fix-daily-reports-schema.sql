-- =====================================================
-- Fix: daily_reports table existed without site_supervisor_id
-- Run this in Supabase SQL Editor if migration 24 failed with:
--   ERROR: column "site_supervisor_id" does not exist
-- =====================================================

-- If old daily_reports has wrong schema, rename it (keeps any old data)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'daily_reports'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'daily_reports' AND column_name = 'site_supervisor_id'
  ) THEN
    ALTER TABLE public.daily_reports RENAME TO daily_reports_legacy_backup;
    RAISE NOTICE 'Renamed old daily_reports → daily_reports_legacy_backup';
  END IF;
END $$;

-- Create correct daily_reports table
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  site_supervisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  raw_text TEXT NOT NULL,
  ai_parsed JSONB,
  approved_by_manager BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_reports_unique_day UNIQUE (project_id, report_date, site_supervisor_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_project_id ON public.daily_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_report_date ON public.daily_reports(project_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_supervisor ON public.daily_reports(site_supervisor_id);

-- RLS for daily_reports
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_reports_select ON public.daily_reports;
CREATE POLICY daily_reports_select ON public.daily_reports
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS daily_reports_insert ON public.daily_reports;
CREATE POLICY daily_reports_insert ON public.daily_reports
  FOR INSERT WITH CHECK (
    (public.is_project_member(project_id) OR public.is_system_admin())
    AND site_supervisor_id = auth.uid()
  );

DROP POLICY IF EXISTS daily_reports_update ON public.daily_reports;
CREATE POLICY daily_reports_update ON public.daily_reports
  FOR UPDATE USING (public.is_project_member(project_id) OR public.is_system_admin());

-- task_progress_updates FK (only if table exists from partial migration 24)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'task_progress_updates'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'task_progress_updates'
      AND constraint_name = 'task_progress_updates_report_id_fkey'
  ) THEN
    ALTER TABLE public.task_progress_updates
      ADD CONSTRAINT task_progress_updates_report_id_fkey
      FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

SELECT 'daily_reports fixed' AS status;
