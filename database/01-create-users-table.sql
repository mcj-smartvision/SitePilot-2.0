-- =====================================================
-- جدول Users (کاربران)
-- =====================================================
-- این جدول تمام کاربران سیستم را ذخیره می‌کند
-- نقش‌ها: admin, project_manager, site_supervisor, hse_officer, storekeeper

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'project_manager', 'site_supervisor', 'hse_officer', 'storekeeper')),
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ایندکس برای جستجو سریع‌تر
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- RLS (Row Level Security) برای امنیت
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own data" ON public.users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
