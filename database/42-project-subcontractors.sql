-- =====================================================
-- Project subcontractors registry + contracts
-- Run in Supabase SQL Editor after migration 41
-- PM (and admin) can register پیمانکاران, attach contracts
-- =====================================================

CREATE TABLE IF NOT EXISTS public.project_subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trade TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  national_id TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_subcontractors_project
  ON public.project_subcontractors(project_id, is_active);

-- Optional link from schedule tasks → registered subcontractor
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS subcontractor_id UUID REFERENCES public.project_subcontractors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_tasks_subcontractor
  ON public.project_tasks(subcontractor_id)
  WHERE subcontractor_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.subcontractor_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  subcontractor_id UUID NOT NULL REFERENCES public.project_subcontractors(id) ON DELETE CASCADE,
  contract_no TEXT,
  title TEXT NOT NULL DEFAULT 'قرارداد پیمانکاری',
  scope_summary TEXT,
  contract_value NUMERIC(18, 2),
  currency TEXT NOT NULL DEFAULT 'IRR',
  start_date DATE,
  end_date DATE,
  retention_percent NUMERIC(5, 2) DEFAULT 10,
  payment_terms TEXT,
  standards_notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  storage_path TEXT,
  storage_bucket TEXT NOT NULL DEFAULT 'subcontractor-contracts',
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subcontractor_contracts_project
  ON public.subcontractor_contracts(project_id, status);

CREATE INDEX IF NOT EXISTS idx_subcontractor_contracts_sub
  ON public.subcontractor_contracts(subcontractor_id);

-- Link AI instructions to a registered subcontractor when PM assigns one
ALTER TABLE public.ai_actions
  ADD COLUMN IF NOT EXISTS subcontractor_id UUID REFERENCES public.project_subcontractors(id) ON DELETE SET NULL;

ALTER TABLE public.project_subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_subcontractors_select ON public.project_subcontractors;
CREATE POLICY project_subcontractors_select ON public.project_subcontractors
  FOR SELECT USING (
    public.is_system_admin()
    OR public.is_project_member(project_id)
  );

DROP POLICY IF EXISTS project_subcontractors_write ON public.project_subcontractors;
CREATE POLICY project_subcontractors_write ON public.project_subcontractors
  FOR ALL USING (
    public.is_system_admin()
    OR public.is_project_member(project_id)
  )
  WITH CHECK (
    public.is_system_admin()
    OR public.is_project_member(project_id)
  );

DROP POLICY IF EXISTS subcontractor_contracts_select ON public.subcontractor_contracts;
CREATE POLICY subcontractor_contracts_select ON public.subcontractor_contracts
  FOR SELECT USING (
    public.is_system_admin()
    OR public.is_project_member(project_id)
  );

DROP POLICY IF EXISTS subcontractor_contracts_write ON public.subcontractor_contracts;
CREATE POLICY subcontractor_contracts_write ON public.subcontractor_contracts
  FOR ALL USING (
    public.is_system_admin()
    OR public.is_project_member(project_id)
  )
  WITH CHECK (
    public.is_system_admin()
    OR public.is_project_member(project_id)
  );

-- Storage bucket for contract PDFs / scans
INSERT INTO storage.buckets (id, name, public)
VALUES ('subcontractor-contracts', 'subcontractor-contracts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS subcontractor_contracts_storage_select ON storage.objects;
CREATE POLICY subcontractor_contracts_storage_select ON storage.objects
  FOR SELECT USING (bucket_id = 'subcontractor-contracts');

DROP POLICY IF EXISTS subcontractor_contracts_storage_insert ON storage.objects;
CREATE POLICY subcontractor_contracts_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'subcontractor-contracts');

DROP POLICY IF EXISTS subcontractor_contracts_storage_update ON storage.objects;
CREATE POLICY subcontractor_contracts_storage_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'subcontractor-contracts');

DROP POLICY IF EXISTS subcontractor_contracts_storage_delete ON storage.objects;
CREATE POLICY subcontractor_contracts_storage_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'subcontractor-contracts');
