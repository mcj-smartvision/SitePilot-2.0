-- =====================================================
-- تحلیل تفصیلی AI — ستون جدید
-- Supabase → SQL Editor → Run
-- =====================================================

ALTER TABLE public.photo_analysis
ADD COLUMN IF NOT EXISTS extended_analysis_json JSONB;

CREATE OR REPLACE VIEW public.v_reports_with_analysis AS
SELECT
  r.id,
  r.project_id,
  r.image_url,
  r.image_storage_path,
  r.created_by,
  r.created_at,
  p.name AS project_name,
  pa.activity_type,
  pa.workforce_count,
  pa.worker_roles_json,
  pa.equipment_json,
  pa.confidence_score,
  pa.extended_analysis_json,
  pa.ai_raw_data
FROM public.reports r
LEFT JOIN public.projects p ON p.id = r.project_id
LEFT JOIN public.photo_analysis pa ON pa.report_id = r.id;
