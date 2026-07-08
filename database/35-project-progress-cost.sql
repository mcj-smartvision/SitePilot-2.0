-- Engineering progress & cumulative cost (separate from financial layer)
-- Run after migration 34

CREATE TABLE IF NOT EXISTS public.project_progress_cost (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  task_uid TEXT NOT NULL,
  task_name TEXT NOT NULL,
  wbs TEXT,
  planned_percent_complete NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (planned_percent_complete >= 0 AND planned_percent_complete <= 100),
  actual_percent_complete NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (actual_percent_complete >= 0 AND actual_percent_complete <= 100),
  status TEXT NOT NULL DEFAULT 'NotStarted'
    CHECK (status IN ('NotStarted', 'InProgress', 'Completed', 'Delayed')),
  progress_variance NUMERIC(5, 2) NOT NULL DEFAULT 0,
  planned_cost_cum NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (planned_cost_cum >= 0),
  actual_cost_cum NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (actual_cost_cum >= 0),
  cost_variance NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, date, task_uid)
);

CREATE INDEX IF NOT EXISTS idx_project_progress_cost_project_date
  ON public.project_progress_cost(project_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_project_progress_cost_task
  ON public.project_progress_cost(project_id, task_uid, date DESC);

ALTER TABLE public.project_progress_cost ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_progress_cost_select ON public.project_progress_cost;
CREATE POLICY project_progress_cost_select ON public.project_progress_cost
  FOR SELECT USING (public.is_project_member(project_id) OR public.is_system_admin());

DROP POLICY IF EXISTS project_progress_cost_write ON public.project_progress_cost;
CREATE POLICY project_progress_cost_write ON public.project_progress_cost
  FOR ALL USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Extend financial_invoices for accountant dashboard (invoice_no, approved/paid amounts)
ALTER TABLE public.financial_invoices
  ADD COLUMN IF NOT EXISTS invoice_no TEXT,
  ADD COLUMN IF NOT EXISTS invoice_date DATE,
  ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(18, 2) DEFAULT 0 CHECK (approved_amount >= 0),
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(18, 2) DEFAULT 0 CHECK (paid_amount >= 0);

ALTER TABLE public.financial_invoices
  DROP CONSTRAINT IF EXISTS financial_invoices_status_check;

ALTER TABLE public.financial_invoices
  ADD CONSTRAINT financial_invoices_status_check
  CHECK (status IN ('draft', 'sent', 'under_review', 'approved', 'paid'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_invoices_project_no
  ON public.financial_invoices(project_id, invoice_no)
  WHERE invoice_no IS NOT NULL;
