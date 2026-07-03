-- =====================================================
-- SitePilot: Multilingual position names + idempotent seed RPC
-- Run in Supabase SQL Editor
-- =====================================================

ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_fa TEXT,
  ADD COLUMN IF NOT EXISTS name_fr TEXT,
  ADD COLUMN IF NOT EXISTS name_de TEXT;

UPDATE public.positions
SET name_en = COALESCE(name_en, title)
WHERE name_en IS NULL;

CREATE OR REPLACE FUNCTION public.seed_project_positions(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  INSERT INTO public.positions (project_id, key, title, name_en, description, is_active)
  VALUES
    (p_project_id, 'project_manager', 'Project Manager', 'Project Manager', 'Overall project planning', true),
    (p_project_id, 'site_manager', 'Site Manager', 'Site Manager', 'Daily site leadership', true),
    (p_project_id, 'site_supervisor', 'Site Supervisor', 'Site Supervisor', 'Daily operations', true),
    (p_project_id, 'civil_engineer', 'Civil Engineer', 'Civil Engineer', 'Civil works', true),
    (p_project_id, 'architect', 'Architect', 'Architect', 'Design compliance', true),
    (p_project_id, 'structural_engineer', 'Structural Engineer', 'Structural Engineer', 'Structural oversight', true),
    (p_project_id, 'mep_engineer', 'MEP Engineer', 'MEP Engineer', 'MEP systems', true),
    (p_project_id, 'hse_officer', 'HSE Officer', 'HSE Officer', 'Health and safety', true),
    (p_project_id, 'qa_qc_inspector', 'QA/QC Inspector', 'QA/QC Inspector', 'Quality inspections', true),
    (p_project_id, 'surveyor', 'Surveyor', 'Surveyor', 'Site measurements', true),
    (p_project_id, 'storekeeper', 'Storekeeper', 'Storekeeper', 'Inventory management', true),
    (p_project_id, 'procurement_officer', 'Procurement Officer', 'Procurement Officer', 'Purchasing', true),
    (p_project_id, 'planning_engineer', 'Planning Engineer', 'Planning Engineer', 'Schedule planning', true),
    (p_project_id, 'document_controller', 'Document Controller', 'Document Controller', 'Document control', true),
    (p_project_id, 'foreman', 'Foreman', 'Foreman', 'Field crew lead', true),
    (p_project_id, 'contractor', 'Contractor', 'Contractor', 'Contractor rep', true),
    (p_project_id, 'subcontractor', 'Subcontractor', 'Subcontractor', 'Subcontractor access', true),
    (p_project_id, 'finance_admin', 'Finance/Admin Officer', 'Finance/Admin Officer', 'Finance admin', true),
    (p_project_id, 'equipment_manager', 'Equipment Manager', 'Equipment Manager', 'Equipment allocation', true),
    (p_project_id, 'security', 'Security', 'Security', 'Site security', true),
    (p_project_id, 'worker', 'Worker', 'Worker', 'Field worker', true),
    (p_project_id, 'visitor', 'Visitor / Temporary Access', 'Visitor / Temporary Access', 'Temporary access', true)
  ON CONFLICT (project_id, key) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_project_positions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_project_positions(UUID) TO service_role;
