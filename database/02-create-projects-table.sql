-- =====================================================
-- جدول Projects (پروژه‌ها)
-- =====================================================
-- هر پروژه ساختمانی یک سطر در این جدول دارد

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  contractor_name VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget DECIMAL(15, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'suspended')),
  project_manager_id UUID REFERENCES public.users(id),
  site_supervisor_id UUID REFERENCES public.users(id),
  hse_officer_id UUID REFERENCES public.users(id),
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ایندکس‌ها
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_project_manager ON public.projects(project_manager_id);
CREATE INDEX idx_projects_created_by ON public.projects(created_by);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read projects they are assigned to" ON public.projects
  FOR SELECT USING (
    auth.uid()::text = project_manager_id::text OR
    auth.uid()::text = site_supervisor_id::text OR
    auth.uid()::text = hse_officer_id::text OR
    auth.jwt() ->> 'role' = 'admin'
  );
