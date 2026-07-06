-- QC inspections, NCRs, and lab tests
-- Run after migration 30

-- Extend ai_actions type for QC alerts escalated to PM
ALTER TABLE public.ai_actions DROP CONSTRAINT IF EXISTS ai_actions_type_check;
ALTER TABLE public.ai_actions ADD CONSTRAINT ai_actions_type_check CHECK (type IN (
  'subcontractor_instruction',
  'purchase_request',
  'pm_comment',
  'hse_alert',
  'qc_action'
));

CREATE TABLE IF NOT EXISTS public.qc_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  schedule_activity_id UUID NOT NULL REFERENCES public.project_tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'passed', 'passed_with_comments', 'failed')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  checklist_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  comments TEXT,
  inspector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  inspected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, schedule_activity_id)
);

CREATE TABLE IF NOT EXISTS public.qc_ncrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ncr_number TEXT NOT NULL,
  title TEXT NOT NULL,
  related_task_id UUID REFERENCES public.project_tasks(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'draft_by_ai'
    CHECK (status IN ('draft_by_ai', 'open', 'under_review', 'closed', 'rejected')),
  ai_generated_text TEXT NOT NULL DEFAULT '',
  formal_text TEXT,
  corrective_action TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  pm_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (pm_status IN ('not_required', 'pending', 'approved', 'rejected')),
  pm_reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pm_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qc_lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL CHECK (test_type IN ('concrete_compression', 'steel_tensile', 'other')),
  sample_id TEXT NOT NULL,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location TEXT NOT NULL DEFAULT '',
  required_value NUMERIC NOT NULL,
  actual_value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'MPa',
  pass BOOLEAN NOT NULL DEFAULT false,
  remarks TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qc_inspections_project ON public.qc_inspections(project_id, status);
CREATE INDEX IF NOT EXISTS idx_qc_ncrs_project ON public.qc_ncrs(project_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qc_lab_tests_project ON public.qc_lab_tests(project_id, test_date DESC);

ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_ncrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qc_lab_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qc_inspections_rw ON public.qc_inspections;
CREATE POLICY qc_inspections_rw ON public.qc_inspections
  FOR ALL USING (public.is_project_member(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS qc_ncrs_rw ON public.qc_ncrs;
CREATE POLICY qc_ncrs_rw ON public.qc_ncrs
  FOR ALL USING (public.is_project_member(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS qc_lab_tests_rw ON public.qc_lab_tests;
CREATE POLICY qc_lab_tests_rw ON public.qc_lab_tests
  FOR ALL USING (public.is_project_member(project_id) OR public.is_system_admin())
  WITH CHECK (public.is_project_member(project_id) OR public.is_system_admin());
