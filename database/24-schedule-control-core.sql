-- =====================================================
-- SitePilot: Schedule control core (MSP tasks, daily reports, alerts)
-- Run in Supabase SQL Editor after migration 23
-- Does NOT modify existing RBAC tables or photo `reports`
--
-- NOTE: User roles come from `positions.key` + `member_positions`,
--       NOT from a profiles.role column (see lib/dashboard/roles.ts).
-- =====================================================

-- -----------------------------------------------------
-- project_tasks (MSP activities)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  msp_uid INTEGER,
  wbs_code TEXT,
  name TEXT NOT NULL,
  start_planned TIMESTAMPTZ,
  finish_planned TIMESTAMPTZ,
  start_current TIMESTAMPTZ,
  finish_current TIMESTAMPTZ,
  percent_complete NUMERIC NOT NULL DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
  is_critical BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_tasks_msp_uid_unique UNIQUE (project_id, msp_uid)
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_dates ON public.project_tasks(project_id, start_planned, finish_planned);
CREATE INDEX IF NOT EXISTS idx_project_tasks_critical ON public.project_tasks(project_id, is_critical);

-- -----------------------------------------------------
-- task_dependencies (FS, SS, FF, SF)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  predecessor_task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  successor_task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('FS', 'SS', 'FF', 'SF')),
  lag_duration INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT task_dependencies_no_self CHECK (predecessor_task_id <> successor_task_id),
  CONSTRAINT task_dependencies_unique UNIQUE (project_id, predecessor_task_id, successor_task_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_project_id ON public.task_dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_predecessor ON public.task_dependencies(predecessor_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_successor ON public.task_dependencies(successor_task_id);

-- -----------------------------------------------------
-- daily_reports (site supervisor textual reports — NOT photo reports)
-- If an old daily_reports exists without site_supervisor_id, rename it first.
-- -----------------------------------------------------

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
  END IF;
END $$;

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

-- -----------------------------------------------------
-- task_progress_updates
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.task_progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.daily_reports(id) ON DELETE SET NULL,
  progress_date DATE NOT NULL DEFAULT CURRENT_DATE,
  percent_complete NUMERIC NOT NULL DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
  note TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_progress_project_id ON public.task_progress_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_task_id ON public.task_progress_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_date ON public.task_progress_updates(project_id, progress_date DESC);

-- -----------------------------------------------------
-- alerts
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  related_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'start_activity',
    'delay_risk',
    'material_purchase',
    'milestone_risk',
    'critical_path',
    'general'
  )),
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_project_id ON public.alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON public.alerts(project_id, is_resolved, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_task_id ON public.alerts(related_task_id);

-- -----------------------------------------------------
-- schedule_imports (MSP XML upload tracking)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.schedule_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  tasks_imported INTEGER NOT NULL DEFAULT 0,
  dependencies_imported INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_schedule_imports_project_id ON public.schedule_imports(project_id);

-- -----------------------------------------------------
-- updated_at trigger for project_tasks
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_project_tasks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_tasks_updated_at ON public.project_tasks;
CREATE TRIGGER trg_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_project_tasks_updated_at();

-- -----------------------------------------------------
-- RLS (project member or system admin)
-- -----------------------------------------------------

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_imports ENABLE ROW LEVEL SECURITY;

-- project_tasks
DROP POLICY IF EXISTS project_tasks_select ON public.project_tasks;
CREATE POLICY project_tasks_select ON public.project_tasks
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS project_tasks_write ON public.project_tasks;
CREATE POLICY project_tasks_write ON public.project_tasks
  FOR ALL USING (public.is_project_member(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_member(project_id) OR public.is_system_admin());

-- task_dependencies
DROP POLICY IF EXISTS task_dependencies_select ON public.task_dependencies;
CREATE POLICY task_dependencies_select ON public.task_dependencies
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS task_dependencies_write ON public.task_dependencies;
CREATE POLICY task_dependencies_write ON public.task_dependencies
  FOR ALL USING (public.is_project_member(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_member(project_id) OR public.is_system_admin());

-- daily_reports
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

-- task_progress_updates
DROP POLICY IF EXISTS task_progress_select ON public.task_progress_updates;
CREATE POLICY task_progress_select ON public.task_progress_updates
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS task_progress_write ON public.task_progress_updates;
CREATE POLICY task_progress_write ON public.task_progress_updates
  FOR ALL USING (public.is_project_member(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_member(project_id) OR public.is_system_admin());

-- alerts
DROP POLICY IF EXISTS alerts_select ON public.alerts;
CREATE POLICY alerts_select ON public.alerts
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS alerts_write ON public.alerts;
CREATE POLICY alerts_write ON public.alerts
  FOR ALL USING (public.is_project_member(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_member(project_id) OR public.is_system_admin());

-- schedule_imports
DROP POLICY IF EXISTS schedule_imports_select ON public.schedule_imports;
CREATE POLICY schedule_imports_select ON public.schedule_imports
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS schedule_imports_write ON public.schedule_imports;
CREATE POLICY schedule_imports_write ON public.schedule_imports
  FOR ALL USING (public.is_project_member(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_member(project_id) OR public.is_system_admin());
