-- =====================================================
-- جدول MaterialLogs (گزارش‌های انبار/مصالح)
-- =====================================================
-- ثبت تمام حرکات مصالح: ورود، خروج، اتلاف

CREATE TABLE IF NOT EXISTS public.material_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  material_name VARCHAR(255) NOT NULL,
  material_code VARCHAR(100),
  category VARCHAR(100),
  quantity DECIMAL(12, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN ('incoming', 'usage', 'waste', 'return')),
  supplier_name VARCHAR(255),
  invoice_number VARCHAR(100),
  cost DECIMAL(15, 2),
  log_date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ایندکس‌ها
CREATE INDEX idx_material_logs_project ON public.material_logs(project_id);
CREATE INDEX idx_material_logs_material ON public.material_logs(material_name);
CREATE INDEX idx_material_logs_entry_type ON public.material_logs(entry_type);
CREATE INDEX idx_material_logs_date ON public.material_logs(log_date);

-- RLS
ALTER TABLE public.material_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read material logs of their projects" ON public.material_logs
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE
        auth.uid()::text = project_manager_id::text OR
        auth.uid()::text = site_supervisor_id::text
    ) OR
    auth.jwt() ->> 'role' = 'admin'
  );
