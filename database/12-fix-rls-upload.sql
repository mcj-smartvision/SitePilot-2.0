-- =====================================================
-- FIX: Row Level Security برای آپلود عکس
-- Supabase → SQL Editor → Run
-- =====================================================

-- ---- STORAGE: project-images bucket ----
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "project_images_public_read" ON storage.objects;
CREATE POLICY "project_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-images');

DROP POLICY IF EXISTS "project_images_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "project_images_insert_active_project" ON storage.objects;
DROP POLICY IF EXISTS "project_images_authenticated_insert" ON storage.objects;

CREATE POLICY "project_images_authenticated_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-images');

DROP POLICY IF EXISTS "project_images_authenticated_update" ON storage.objects;
CREATE POLICY "project_images_authenticated_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'project-images');

DROP POLICY IF EXISTS "project_images_authenticated_delete" ON storage.objects;
CREATE POLICY "project_images_authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-images');

-- ---- REPORTS table (if missing) ----
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

-- ---- REPORTS policies ----
DROP POLICY IF EXISTS "reports_insert_active_project" ON public.reports;
DROP POLICY IF EXISTS "reports_insert_assigned" ON public.reports;
DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
DROP POLICY IF EXISTS "reports_select_assigned" ON public.reports;

CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

-- ---- PHOTO_ANALYSIS policies ----
DROP POLICY IF EXISTS "photo_analysis_insert_own_report" ON public.photo_analysis;
DROP POLICY IF EXISTS "photo_analysis_select_own" ON public.photo_analysis;

CREATE POLICY "photo_analysis_insert_own_report" ON public.photo_analysis
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.created_by = auth.uid())
  );

CREATE POLICY "photo_analysis_select_own" ON public.photo_analysis
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.created_by = auth.uid())
  );

-- ---- View for archive ----
CREATE OR REPLACE VIEW public.v_reports_with_analysis AS
SELECT
  r.id, r.project_id, r.image_url, r.image_storage_path, r.created_by, r.created_at,
  p.name AS project_name,
  pa.activity_type, pa.workforce_count, pa.worker_roles_json,
  pa.equipment_json, pa.confidence_score, pa.ai_raw_data
FROM public.reports r
LEFT JOIN public.projects p ON p.id = r.project_id
LEFT JOIN public.photo_analysis pa ON pa.report_id = r.id;
