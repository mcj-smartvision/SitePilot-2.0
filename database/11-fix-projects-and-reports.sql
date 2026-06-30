-- =====================================================
-- FIX: نمایش پروژه‌ها + پروژه نمونه
-- این را در Supabase → SQL Editor → Run بزنید
-- =====================================================

-- 1) اجازه بده همه کاربران logged-in پروژه‌های active را ببینند
DROP POLICY IF EXISTS "site_supervisors_read_active_projects" ON public.projects;
CREATE POLICY "site_supervisors_read_active_projects" ON public.projects
  FOR SELECT TO authenticated
  USING (status IN ('active', 'planning'));

-- 2) ساخت پروژه نمونه (اگر نبود)
INSERT INTO public.projects (name, location, start_date, end_date, status)
SELECT 'پروژه نمونه', 'تهران', CURRENT_DATE, CURRENT_DATE + 365, 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects WHERE name = 'پروژه نمونه'
);

-- 3) جداول reports (اگر هنوز نساخته‌اید)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_storage_path TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.photo_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL UNIQUE REFERENCES public.reports(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  workforce_count INTEGER NOT NULL DEFAULT 0,
  worker_roles_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_score NUMERIC(4,3),
  ai_raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_active_project" ON public.reports;
CREATE POLICY "reports_insert_active_project" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.status IN ('active', 'planning'))
  );

DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT TO authenticated USING (created_by = auth.uid());

DROP POLICY IF EXISTS "photo_analysis_insert_own_report" ON public.photo_analysis;
CREATE POLICY "photo_analysis_insert_own_report" ON public.photo_analysis
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.created_by = auth.uid()));

DROP POLICY IF EXISTS "photo_analysis_select_own" ON public.photo_analysis;
CREATE POLICY "photo_analysis_select_own" ON public.photo_analysis
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.created_by = auth.uid()));

CREATE OR REPLACE VIEW public.v_reports_with_analysis AS
SELECT r.*, p.name AS project_name, pa.activity_type, pa.workforce_count,
       pa.worker_roles_json, pa.equipment_json, pa.confidence_score, pa.ai_raw_data
FROM public.reports r
LEFT JOIN public.projects p ON p.id = r.project_id
LEFT JOIN public.photo_analysis pa ON pa.report_id = r.id;

-- 4) Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
