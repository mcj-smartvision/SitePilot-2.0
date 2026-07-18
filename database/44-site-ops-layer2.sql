-- =====================================================
-- Layer 2: Site Ops (CRE bridge + daily control MVP)
-- Run in Supabase SQL Editor after migration 43
-- Additive only — does not modify CRE / MSP schedule tables
-- =====================================================

-- CRE run imports (external Liparta CRE Phase 1 JSON)
CREATE TABLE IF NOT EXISTS public.site_ops_cre_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  policy_version TEXT NOT NULL DEFAULT 'phase1_default_v1',
  gate TEXT NOT NULL CHECK (gate IN ('CONTROL_READY', 'NOT_CONTROL_READY')),
  overall_score NUMERIC NOT NULL DEFAULT 0,
  blocker_count INTEGER NOT NULL DEFAULT 0,
  forecast TEXT,
  raw_json JSONB NOT NULL,
  summary_json JSONB NOT NULL,
  imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_ops_cre_runs_project
  ON public.site_ops_cre_runs(project_id, created_at DESC);

-- Frozen snapshots after promote
CREATE TABLE IF NOT EXISTS public.site_ops_operational_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  cre_run_id UUID NOT NULL REFERENCES public.site_ops_cre_runs(id) ON DELETE CASCADE,
  task_uid INTEGER NOT NULL,
  wbs TEXT,
  name TEXT NOT NULL,
  location_json JSONB,
  quantity_json JSONB,
  uom_json JSONB,
  crew_resource_json JSONB,
  person_day_json JSONB,
  progress_method_json JSONB,
  start_json JSONB,
  finish_json JSONB,
  readiness_row_status TEXT NOT NULL
    CHECK (readiness_row_status IN ('READY', 'PARTIAL', 'NOT_READY')),
  force_promoted BOOLEAN NOT NULL DEFAULT false,
  force_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cre_run_id, task_uid)
);

CREATE INDEX IF NOT EXISTS idx_site_ops_ops_tasks_project
  ON public.site_ops_operational_tasks(project_id, is_active, task_uid);

-- Crews (minimal MVP)
CREATE TABLE IF NOT EXISTS public.site_ops_crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cre_resource_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_ops_crews_project
  ON public.site_ops_crews(project_id, is_active);

-- Daily plans
CREATE TABLE IF NOT EXISTS public.site_ops_daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'ISSUED', 'LOCKED', 'CLOSED')),
  notes TEXT,
  cre_run_id UUID REFERENCES public.site_ops_cre_runs(id) ON DELETE SET NULL,
  gate_at_issue TEXT,
  override_used BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  closed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  supervisor_signed_off BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_site_ops_daily_plans_project_date
  ON public.site_ops_daily_plans(project_id, plan_date DESC);

-- Work orders
CREATE TABLE IF NOT EXISTS public.site_ops_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_plan_id UUID NOT NULL REFERENCES public.site_ops_daily_plans(id) ON DELETE CASCADE,
  operational_task_id UUID NOT NULL REFERENCES public.site_ops_operational_tasks(id) ON DELETE RESTRICT,
  planned_quantity NUMERIC NOT NULL DEFAULT 0,
  planned_person_days NUMERIC NOT NULL DEFAULT 0,
  assigned_crew_id UUID REFERENCES public.site_ops_crews(id) ON DELETE SET NULL,
  location TEXT,
  shift TEXT,
  status TEXT NOT NULL DEFAULT 'PLANNED'
    CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'DONE', 'BLOCKED', 'CANCELLED')),
  constraints TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_ops_work_orders_plan
  ON public.site_ops_work_orders(daily_plan_id, status);

-- Actuals
CREATE TABLE IF NOT EXISTS public.site_ops_actual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.site_ops_work_orders(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actual_quantity NUMERIC NOT NULL DEFAULT 0,
  actual_person_days NUMERIC NOT NULL DEFAULT 0,
  actual_uom TEXT,
  actual_start TIMESTAMPTZ,
  actual_finish TIMESTAMPTZ,
  progress_method TEXT,
  evidence_notes TEXT,
  status TEXT NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_site_ops_actuals_wo
  ON public.site_ops_actual_entries(work_order_id, created_at DESC);

-- Constraint log
CREATE TABLE IF NOT EXISTS public.site_ops_constraint_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  daily_plan_id UUID REFERENCES public.site_ops_daily_plans(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.site_ops_work_orders(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily report snapshots
CREATE TABLE IF NOT EXISTS public.site_ops_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  daily_plan_id UUID NOT NULL REFERENCES public.site_ops_daily_plans(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  report_json JSONB NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (daily_plan_id)
);

-- Append-only audit
CREATE TABLE IF NOT EXISTS public.site_ops_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_ops_audit_project
  ON public.site_ops_audit_log(project_id, created_at DESC);

-- Optional explicit site-ops role grants (beyond position bootstrap)
CREATE TABLE IF NOT EXISTS public.site_ops_role_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'PROJECT_CONTROLS', 'PLANNER', 'SITE_MANAGER', 'SUPERVISOR',
    'HSE', 'WAREHOUSE', 'GUARD', 'VIEWER'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id, role)
);

-- RLS
ALTER TABLE public.site_ops_cre_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ops_operational_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ops_crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ops_daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ops_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ops_actual_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ops_constraint_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ops_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ops_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_ops_role_grants ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'site_ops_cre_runs',
    'site_ops_operational_tasks',
    'site_ops_crews',
    'site_ops_daily_plans',
    'site_ops_constraint_logs',
    'site_ops_daily_reports',
    'site_ops_audit_log',
    'site_ops_role_grants'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (
        public.is_system_admin() OR public.is_project_member(project_id)
      )', t, t
    );
  END LOOP;
END $$;

-- Work orders inherit project via plan — use security definer helper
CREATE OR REPLACE FUNCTION public.site_ops_work_order_project_id(p_wo UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dp.project_id
  FROM public.site_ops_work_orders wo
  JOIN public.site_ops_daily_plans dp ON dp.id = wo.daily_plan_id
  WHERE wo.id = p_wo
$$;

DROP POLICY IF EXISTS site_ops_work_orders_select ON public.site_ops_work_orders;
CREATE POLICY site_ops_work_orders_select ON public.site_ops_work_orders
  FOR SELECT TO authenticated
  USING (
    public.is_system_admin()
    OR public.is_project_member(public.site_ops_work_order_project_id(id))
  );

DROP POLICY IF EXISTS site_ops_actual_entries_select ON public.site_ops_actual_entries;
CREATE POLICY site_ops_actual_entries_select ON public.site_ops_actual_entries
  FOR SELECT TO authenticated
  USING (
    public.is_system_admin()
    OR public.is_project_member(public.site_ops_work_order_project_id(work_order_id))
  );

-- Inserts/updates: project members (finer checks in API)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'site_ops_cre_runs',
    'site_ops_operational_tasks',
    'site_ops_crews',
    'site_ops_daily_plans',
    'site_ops_constraint_logs',
    'site_ops_daily_reports',
    'site_ops_audit_log',
    'site_ops_role_grants'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_write ON public.%I FOR ALL TO authenticated USING (
        public.is_system_admin() OR public.is_project_member(project_id)
      ) WITH CHECK (
        public.is_system_admin() OR public.is_project_member(project_id)
      )', t, t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS site_ops_work_orders_write ON public.site_ops_work_orders;
CREATE POLICY site_ops_work_orders_write ON public.site_ops_work_orders
  FOR ALL TO authenticated
  USING (
    public.is_system_admin()
    OR public.is_project_member(public.site_ops_work_order_project_id(id))
  )
  WITH CHECK (
    public.is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.site_ops_daily_plans dp
      WHERE dp.id = daily_plan_id
        AND (public.is_system_admin() OR public.is_project_member(dp.project_id))
    )
  );

DROP POLICY IF EXISTS site_ops_actual_entries_write ON public.site_ops_actual_entries;
CREATE POLICY site_ops_actual_entries_write ON public.site_ops_actual_entries
  FOR ALL TO authenticated
  USING (
    public.is_system_admin()
    OR public.is_project_member(public.site_ops_work_order_project_id(work_order_id))
  )
  WITH CHECK (
    public.is_system_admin()
    OR public.is_project_member(public.site_ops_work_order_project_id(work_order_id))
  );
