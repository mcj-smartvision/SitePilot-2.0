-- =====================================================
-- SitePilot RBAC Dashboard Enhancements
-- Run in Supabase SQL Editor after migration 16
-- =====================================================

-- First-login flag on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN NOT NULL DEFAULT true;

-- Daily report fields on reports
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN NOT NULL DEFAULT false;

-- Additional default positions (security, client) for existing projects
INSERT INTO public.positions (project_id, title, key, description, is_active)
SELECT p.id, seed.title, seed.key, seed.description, true
FROM public.projects p
CROSS JOIN (
  VALUES
    ('Security Officer', 'security', 'Gate access, entry/exit logs, and site security alerts.'),
    ('Client Representative', 'client', 'Read-only stakeholder access to progress and financial summaries.')
) AS seed(title, key, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public.positions pos
  WHERE pos.project_id = p.id AND pos.key = seed.key
);

-- Extended dashboard widgets
INSERT INTO public.dashboard_widgets (key, title, description, default_visible, sort_order) VALUES
  ('progress.overview', 'Progress Overview', 'Planned vs actual progress and SPI summary', true, 15),
  ('inventory.stock', 'Inventory & Stock', 'Material stock levels and receiving status', true, 25),
  ('reports.daily', 'Daily Report', 'Submit and finalize daily site reports with AI assist', true, 35),
  ('security.entry_exit', 'Entry / Exit Logs', 'Personnel and vehicle gate activity', true, 45),
  ('schedule.overview', 'Schedule', 'Baseline schedule and upcoming milestones', true, 55),
  ('safety.overview', 'Safety Overview', 'HSE incidents, observations, and compliance', true, 65),
  ('financial.overview', 'Financial Summary', 'High-level cost and contract performance', true, 75)
ON CONFLICT (key) DO NOTHING;

-- New users created by admin should start with is_first_login = true (handled in app)
UPDATE public.profiles
SET is_first_login = false
WHERE is_first_login = true
  AND EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.user_id = profiles.id AND pm.password_changed_by_member = true
  );
