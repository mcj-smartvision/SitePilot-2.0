-- =====================================================
-- جدول Tasks (تسک‌ها و فعالیت‌های زمان‌بندی‌شده)
-- =====================================================
-- هر تسک در پروژه برای پیگیری پیشرفت ثبت می‌شود

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  phase VARCHAR(100),
  scheduled_start DATE NOT NULL,
  scheduled_end DATE NOT NULL,
  actual_start DATE,
  actual_end DATE,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  assigned_to UUID REFERENCES public.users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold', 'delayed')),
  priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  predecessor_id UUID REFERENCES public.tasks(id),
  duration_days INTEGER,
  critical_path BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ایندکس‌ها
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_dates ON public.tasks(scheduled_start, scheduled_end);

-- RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read tasks of their projects" ON public.tasks
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE
        auth.uid()::text = project_manager_id::text OR
        auth.uid()::text = site_supervisor_id::text
    ) OR
    auth.jwt() ->> 'role' = 'admin'
  );
