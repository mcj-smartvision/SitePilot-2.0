-- =====================================================
-- Layer 2 Workshop Operations (simple field UX)
-- Immutable MSP stays in project_tasks; children live here.
-- Run after migration 45
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workshop_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  project_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  parent_package_id UUID REFERENCES public.workshop_packages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  uom TEXT NOT NULL,
  crew TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'ready'
    CHECK (status IN ('draft', 'ready', 'in_progress', 'partial', 'done', 'blocked', 'needs_review')),
  origin TEXT NOT NULL DEFAULT 'user_added'
    CHECK (origin IN ('user_added', 'seeded', 'imported')),
  flag_for_review BOOLEAN NOT NULL DEFAULT false,
  review_reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workshop_packages_parent_chk CHECK (
    project_task_id IS NOT NULL OR parent_package_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_workshop_packages_project
  ON public.workshop_packages(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_packages_task
  ON public.workshop_packages(project_task_id);
CREATE INDEX IF NOT EXISTS idx_workshop_packages_parent
  ON public.workshop_packages(parent_package_id);

CREATE TABLE IF NOT EXISTS public.workshop_daily_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.workshop_packages(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  planned_qty NUMERIC NOT NULL CHECK (planned_qty > 0),
  crew_override TEXT,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'partial', 'done', 'blocked')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (package_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_workshop_daily_project_date
  ON public.workshop_daily_assignments(project_id, plan_date DESC);

CREATE TABLE IF NOT EXISTS public.workshop_actual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.workshop_daily_assignments(id) ON DELETE CASCADE,
  actual_qty NUMERIC NOT NULL CHECK (actual_qty >= 0),
  status TEXT NOT NULL CHECK (status IN ('done', 'partial', 'blocked')),
  note TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workshop_actuals_assignment
  ON public.workshop_actual_entries(assignment_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.workshop_review_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('package', 'actual', 'assignment')),
  entity_id UUID NOT NULL,
  reason_code TEXT NOT NULL CHECK (reason_code IN (
    'out_of_baseline_scope',
    'missing_quantity_basis',
    'missing_uom',
    'resource_unclear',
    'needs_technical_mapping',
    'other'
  )),
  severity TEXT NOT NULL DEFAULT 'warn' CHECK (severity IN ('info', 'warn', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  note TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workshop_flags_project_open
  ON public.workshop_review_flags(project_id, status, created_at DESC);

ALTER TABLE public.workshop_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_daily_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_actual_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_review_flags ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workshop_packages',
    'workshop_daily_assignments',
    'workshop_review_flags'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_all ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_all ON public.%I FOR ALL TO authenticated USING (
        public.is_system_admin() OR public.is_project_member(project_id)
      ) WITH CHECK (
        public.is_system_admin() OR public.is_project_member(project_id)
      )', t, t
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.workshop_assignment_project_id(p_assignment UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT project_id FROM public.workshop_daily_assignments WHERE id = p_assignment
$$;

DROP POLICY IF EXISTS workshop_actual_entries_all ON public.workshop_actual_entries;
CREATE POLICY workshop_actual_entries_all ON public.workshop_actual_entries
  FOR ALL TO authenticated
  USING (
    public.is_system_admin()
    OR public.is_project_member(public.workshop_assignment_project_id(assignment_id))
  )
  WITH CHECK (
    public.is_system_admin()
    OR public.is_project_member(public.workshop_assignment_project_id(assignment_id))
  );
