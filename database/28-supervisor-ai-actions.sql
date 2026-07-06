-- =====================================================
-- SitePilot: Site Supervisor AI actions + structured daily report activities
-- Run in Supabase SQL Editor after migration 27
-- =====================================================

-- Extend daily_reports with AI approval workflow
ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS summary_text TEXT,
  ADD COLUMN IF NOT EXISTS ai_status TEXT NOT NULL DEFAULT 'draft_by_ai'
    CHECK (ai_status IN ('draft_by_ai', 'confirmed_by_user', 'rejected_by_user'));

-- Structured per-activity rows linked to a daily report
CREATE TABLE IF NOT EXISTS public.daily_report_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  schedule_activity_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  planned_status TEXT NOT NULL CHECK (planned_status IN ('shouldStart', 'shouldContinue', 'shouldFinish')),
  actual_status TEXT NOT NULL CHECK (actual_status IN ('notStarted', 'started', 'finished')),
  actual_progress_percent NUMERIC NOT NULL DEFAULT 0 CHECK (actual_progress_percent >= 0 AND actual_progress_percent <= 100),
  quality_status TEXT NOT NULL DEFAULT 'good' CHECK (quality_status IN ('good', 'acceptable', 'problematic')),
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_report_activities_report ON public.daily_report_activities(daily_report_id);
CREATE INDEX IF NOT EXISTS idx_daily_report_activities_task ON public.daily_report_activities(schedule_activity_id);

-- AI-generated actions requiring supervisor approval before sending
CREATE TABLE IF NOT EXISTS public.ai_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'subcontractor_instruction',
    'purchase_request',
    'pm_comment',
    'hse_alert'
  )),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  related_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  text_generated TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft_by_ai'
    CHECK (status IN ('draft_by_ai', 'confirmed_by_user', 'rejected_by_user')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_project ON public.ai_actions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_actions_supervisor ON public.ai_actions(supervisor_id, status);

-- RLS
ALTER TABLE public.daily_report_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_report_activities_select ON public.daily_report_activities;
CREATE POLICY daily_report_activities_select ON public.daily_report_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.daily_reports dr
      WHERE dr.id = daily_report_id
        AND (public.is_project_member(dr.project_id) OR public.is_system_admin())
    )
  );

DROP POLICY IF EXISTS daily_report_activities_write ON public.daily_report_activities;
CREATE POLICY daily_report_activities_write ON public.daily_report_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.daily_reports dr
      WHERE dr.id = daily_report_id
        AND (public.is_project_member(dr.project_id) OR public.is_system_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_reports dr
      WHERE dr.id = daily_report_id
        AND dr.site_supervisor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS ai_actions_select ON public.ai_actions;
CREATE POLICY ai_actions_select ON public.ai_actions
  FOR SELECT USING (
    (supervisor_id = auth.uid() OR public.is_project_member(project_id) OR public.is_system_admin())
    AND (status = 'confirmed_by_user' OR supervisor_id = auth.uid() OR public.is_system_admin())
  );

DROP POLICY IF EXISTS ai_actions_insert ON public.ai_actions;
CREATE POLICY ai_actions_insert ON public.ai_actions
  FOR INSERT WITH CHECK (
    supervisor_id = auth.uid()
    AND created_by = auth.uid()
    AND (public.is_project_member(project_id) OR public.is_system_admin())
  );

DROP POLICY IF EXISTS ai_actions_update ON public.ai_actions;
CREATE POLICY ai_actions_update ON public.ai_actions
  FOR UPDATE USING (supervisor_id = auth.uid() OR public.is_system_admin());
