-- =====================================================
-- جدول DailyLogs (گزارش‌های روزانه)
-- =====================================================
-- هر روز در هر پروژه یک گزارش روزانه ثبت می‌شود

CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  workers_count INTEGER NOT NULL DEFAULT 0,
  weather VARCHAR(50) CHECK (weather IN ('sunny', 'rainy', 'cloudy', 'snowy', 'foggy')),
  weather_notes TEXT,
  temperature DECIMAL(5, 2),
  humidity INTEGER CHECK (humidity >= 0 AND humidity <= 100),
  tasks_completed TEXT,
  obstacles TEXT,
  safety_incidents TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, log_date)
);

-- ایندکس‌ها
CREATE INDEX idx_daily_logs_project ON public.daily_logs(project_id);
CREATE INDEX idx_daily_logs_date ON public.daily_logs(log_date);
CREATE INDEX idx_daily_logs_created_by ON public.daily_logs(created_by);

-- RLS
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read daily logs of their projects" ON public.daily_logs
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE
        auth.uid()::text = project_manager_id::text OR
        auth.uid()::text = site_supervisor_id::text OR
        auth.uid()::text = hse_officer_id::text
    ) OR
    auth.jwt() ->> 'role' = 'admin'
  );
