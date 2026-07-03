-- =====================================================
-- Views (نماهای برای داده‌های پیچیده)
-- =====================================================
-- این Views برای داشبورد و گزارش‌ها استفاده می‌شوند

-- VIEW 1: Project Overview
CREATE OR REPLACE VIEW public.v_project_overview AS
SELECT
  p.id,
  p.name,
  p.location,
  p.status,
  p.start_date,
  p.end_date,
  pm.full_name as project_manager,
  ss.full_name as site_supervisor,
  hse.full_name as hse_officer,
  COUNT(DISTINCT dl.id) as daily_logs_count,
  COUNT(DISTINCT t.id) as total_tasks,
  COALESCE(AVG(t.progress_percentage), 0) as average_progress,
  COUNT(DISTINCT CASE WHEN t.status = 'delayed' THEN t.id END) as delayed_tasks
FROM public.projects p
LEFT JOIN public.users pm ON p.project_manager_id = pm.id
LEFT JOIN public.users ss ON p.site_supervisor_id = ss.id
LEFT JOIN public.users hse ON p.hse_officer_id = hse.id
LEFT JOIN public.daily_logs dl ON p.id = dl.project_id
LEFT JOIN public.tasks t ON p.id = t.project_id
GROUP BY p.id, p.name, p.location, p.status, p.start_date, p.end_date,
         pm.full_name, ss.full_name, hse.full_name;

-- VIEW 2: Material Inventory Summary
CREATE OR REPLACE VIEW public.v_material_inventory AS
SELECT
  project_id,
  material_name,
  category,
  unit,
  SUM(CASE WHEN entry_type = 'incoming' THEN quantity ELSE 0 END) as total_incoming,
  SUM(CASE WHEN entry_type = 'usage' THEN quantity ELSE 0 END) as total_usage,
  SUM(CASE WHEN entry_type = 'waste' THEN quantity ELSE 0 END) as total_waste,
  SUM(CASE WHEN entry_type = 'incoming' THEN quantity ELSE 0 END) -
  SUM(CASE WHEN entry_type IN ('usage', 'waste') THEN quantity ELSE 0 END) as current_inventory,
  MAX(log_date) as last_update
FROM public.material_logs
GROUP BY project_id, material_name, category, unit;

-- VIEW 3: Safety Analysis Summary
CREATE OR REPLACE VIEW public.v_safety_analysis_summary AS
SELECT
  project_id,
  COUNT(*) as total_analysis,
  COUNT(CASE WHEN safety_severity = 'critical' THEN 1 END) as critical_issues,
  COUNT(CASE WHEN safety_severity = 'high' THEN 1 END) as high_issues,
  COUNT(CASE WHEN safety_severity = 'medium' THEN 1 END) as medium_issues,
  COUNT(CASE WHEN safety_severity = 'low' THEN 1 END) as low_issues,
  AVG(confidence_score) as avg_confidence,
  MAX(created_at) as last_analysis
FROM public.vision_analysis
WHERE analysis_type = 'safety'
GROUP BY project_id;
