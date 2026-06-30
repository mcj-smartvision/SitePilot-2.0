-- =====================================================
-- SitePilot Admin RBAC System
-- Run in Supabase SQL Editor after migrations 01-13
-- =====================================================

-- -----------------------------------------------------
-- Helper functions
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- Profiles (auth-linked user records)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync existing auth users into profiles
INSERT INTO public.profiles (id, email, full_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- -----------------------------------------------------
-- Extend projects table (non-breaking)
-- -----------------------------------------------------

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_code_unique
  ON public.projects(code) WHERE code IS NOT NULL;

-- Relax legacy NOT NULL constraints for admin-created projects
ALTER TABLE public.projects ALTER COLUMN location DROP NOT NULL;
ALTER TABLE public.projects ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE public.projects ALTER COLUMN end_date DROP NOT NULL;

-- -----------------------------------------------------
-- System roles (global app administration)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.system_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_system_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  system_role_id UUID NOT NULL REFERENCES public.system_roles(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES public.profiles(id),
  UNIQUE (user_id, system_role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_system_roles_user ON public.user_system_roles(user_id);

-- -----------------------------------------------------
-- Project members
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_email ON public.project_members(email);

DROP TRIGGER IF EXISTS project_members_set_updated_at ON public.project_members;
CREATE TRIGGER project_members_set_updated_at
  BEFORE UPDATE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- Positions (project-scoped)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  key TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, key)
);

CREATE INDEX IF NOT EXISTS idx_positions_project ON public.positions(project_id);

DROP TRIGGER IF EXISTS positions_set_updated_at ON public.positions;
CREATE TRIGGER positions_set_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- Member positions (many-to-many)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.member_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_member_id UUID NOT NULL REFERENCES public.project_members(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  UNIQUE (project_member_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_member_positions_member ON public.member_positions(project_member_id);
CREATE INDEX IF NOT EXISTS idx_member_positions_position ON public.member_positions(position_id);

-- -----------------------------------------------------
-- Features (permission modules)
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  module_group TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.position_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (position_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_position_features_position ON public.position_features(position_id);

-- -----------------------------------------------------
-- Event types & notification routing
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type_id UUID NOT NULL REFERENCES public.event_types(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, event_type_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_routes_project ON public.notification_routes(project_id);

DROP TRIGGER IF EXISTS notification_routes_set_updated_at ON public.notification_routes;
CREATE TRIGGER notification_routes_set_updated_at
  BEFORE UPDATE ON public.notification_routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- Dashboard widgets
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  default_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.position_dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  widget_id UUID NOT NULL REFERENCES public.dashboard_widgets(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (position_id, widget_id)
);

CREATE INDEX IF NOT EXISTS idx_position_dashboard_widgets_position
  ON public.position_dashboard_widgets(position_id);

-- -----------------------------------------------------
-- Seed catalog data (data-driven UI)
-- -----------------------------------------------------

INSERT INTO public.system_roles (key, title, description) VALUES
  ('system_admin', 'System Administrator', 'Full platform administration access'),
  ('it_admin', 'IT Administrator', 'Manage projects, members, routing, and widgets')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.features (key, title, description, module_group) VALUES
  ('reports.view', 'View Reports', 'View site photo reports and AI analysis', 'reports'),
  ('reports.create', 'Create Reports', 'Upload and submit new site reports', 'reports'),
  ('projects.view', 'View Projects', 'View assigned project details', 'projects'),
  ('members.view', 'View Members', 'View project member directory', 'members'),
  ('admin.manage', 'Admin Management', 'Access admin configuration screens', 'admin')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.event_types (key, title, description, category) VALUES
  ('report.created', 'Report Created', 'A new site photo report was submitted', 'reports'),
  ('report.analysis_failed', 'Analysis Failed', 'AI analysis failed for a report', 'reports'),
  ('safety.risk_detected', 'Safety Risk Detected', 'A safety risk was detected in analysis', 'safety'),
  ('member.invited', 'Member Invited', 'A new member was invited to the project', 'members'),
  ('project.updated', 'Project Updated', 'Project settings were updated', 'projects')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.dashboard_widgets (key, title, description, default_visible, sort_order) VALUES
  ('overview.stats', 'Overview Stats', 'High-level project statistics', true, 10),
  ('reports.recent', 'Recent Reports', 'Latest submitted photo reports', true, 20),
  ('reports.upload', 'Upload Report', 'Quick access to report submission', true, 30),
  ('safety.alerts', 'Safety Alerts', 'Recent safety-related notifications', true, 40),
  ('members.directory', 'Member Directory', 'Project team member list', false, 50),
  ('activity.feed', 'Activity Feed', 'Recent project activity timeline', false, 60)
ON CONFLICT (key) DO NOTHING;

-- Grant the first profile system admin (bootstrap)
INSERT INTO public.user_system_roles (user_id, system_role_id)
SELECT p.id, sr.id
FROM public.profiles p
CROSS JOIN public.system_roles sr
WHERE sr.key = 'system_admin'
  AND p.email IS NOT NULL
ORDER BY p.created_at ASC
LIMIT 1
ON CONFLICT (user_id, system_role_id) DO NOTHING;

-- -----------------------------------------------------
-- Helper functions (after tables exist)
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_system_roles usr
    JOIN public.system_roles sr ON sr.id = usr.system_role_id
    WHERE usr.user_id = auth.uid()
      AND sr.is_active = true
      AND sr.key IN ('system_admin', 'it_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = p_project_id
      AND pm.user_id = auth.uid()
      AND pm.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_system_admin() OR public.is_project_member(p_project_id);
$$;

-- -----------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS profiles_select_project_peers ON public.profiles;
CREATE POLICY profiles_select_project_peers ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm1
      JOIN public.project_members pm2 ON pm2.project_id = pm1.project_id
      WHERE pm1.user_id = auth.uid() AND pm2.user_id = profiles.id
        AND pm1.is_active = true AND pm2.is_active = true
    )
  );

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_system_admin())
  WITH CHECK (id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS profiles_admin_insert ON public.profiles;
CREATE POLICY profiles_admin_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin());

-- System roles (read-only for authenticated, write for admins)
DROP POLICY IF EXISTS system_roles_select ON public.system_roles;
CREATE POLICY system_roles_select ON public.system_roles
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS system_roles_admin_all ON public.system_roles;
CREATE POLICY system_roles_admin_all ON public.system_roles
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- User system roles
DROP POLICY IF EXISTS user_system_roles_select ON public.user_system_roles;
CREATE POLICY user_system_roles_select ON public.user_system_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS user_system_roles_admin_all ON public.user_system_roles;
CREATE POLICY user_system_roles_admin_all ON public.user_system_roles
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Projects (admin full access + members read assigned)
DROP POLICY IF EXISTS projects_admin_all ON public.projects;
CREATE POLICY projects_admin_all ON public.projects
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS projects_member_select ON public.projects;
CREATE POLICY projects_member_select ON public.projects
  FOR SELECT TO authenticated
  USING (public.is_project_member(id));

-- Project members
DROP POLICY IF EXISTS project_members_admin_all ON public.project_members;
CREATE POLICY project_members_admin_all ON public.project_members
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS project_members_select ON public.project_members;
CREATE POLICY project_members_select ON public.project_members
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS project_members_update_own ON public.project_members;
CREATE POLICY project_members_update_own ON public.project_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Positions
DROP POLICY IF EXISTS positions_admin_all ON public.positions;
CREATE POLICY positions_admin_all ON public.positions
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS positions_member_select ON public.positions;
CREATE POLICY positions_member_select ON public.positions
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

-- Member positions
DROP POLICY IF EXISTS member_positions_admin_all ON public.member_positions;
CREATE POLICY member_positions_admin_all ON public.member_positions
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS member_positions_member_select ON public.member_positions;
CREATE POLICY member_positions_member_select ON public.member_positions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public.positions pos ON pos.id = member_positions.position_id
      WHERE pm.id = member_positions.project_member_id
        AND public.is_project_member(pos.project_id)
    )
  );

-- Catalog tables: features, event_types, dashboard_widgets
DROP POLICY IF EXISTS features_select ON public.features;
CREATE POLICY features_select ON public.features
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS features_admin_all ON public.features;
CREATE POLICY features_admin_all ON public.features
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS event_types_select ON public.event_types;
CREATE POLICY event_types_select ON public.event_types
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS event_types_admin_all ON public.event_types;
CREATE POLICY event_types_admin_all ON public.event_types
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS dashboard_widgets_select ON public.dashboard_widgets;
CREATE POLICY dashboard_widgets_select ON public.dashboard_widgets
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS dashboard_widgets_admin_all ON public.dashboard_widgets;
CREATE POLICY dashboard_widgets_admin_all ON public.dashboard_widgets
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Position features & widgets & routes (admin manage, members read own project)
DROP POLICY IF EXISTS position_features_admin_all ON public.position_features;
CREATE POLICY position_features_admin_all ON public.position_features
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS position_features_member_select ON public.position_features;
CREATE POLICY position_features_member_select ON public.position_features
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.positions pos
      WHERE pos.id = position_features.position_id
        AND public.is_project_member(pos.project_id)
    )
  );

DROP POLICY IF EXISTS notification_routes_admin_all ON public.notification_routes;
CREATE POLICY notification_routes_admin_all ON public.notification_routes
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS notification_routes_member_select ON public.notification_routes;
CREATE POLICY notification_routes_member_select ON public.notification_routes
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

DROP POLICY IF EXISTS position_dashboard_widgets_admin_all ON public.position_dashboard_widgets;
CREATE POLICY position_dashboard_widgets_admin_all ON public.position_dashboard_widgets
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

DROP POLICY IF EXISTS position_dashboard_widgets_member_select ON public.position_dashboard_widgets;
CREATE POLICY position_dashboard_widgets_member_select ON public.position_dashboard_widgets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.positions pos
      WHERE pos.id = position_dashboard_widgets.position_id
        AND public.is_project_member(pos.project_id)
    )
  );

-- -----------------------------------------------------
-- Useful views
-- -----------------------------------------------------

CREATE OR REPLACE VIEW public.v_project_members_with_positions AS
SELECT
  pm.id,
  pm.project_id,
  pm.user_id,
  pm.email,
  pm.full_name,
  pm.phone,
  pm.is_active,
  pm.invited_at,
  pm.joined_at,
  pm.created_at,
  pm.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'id', pos.id,
        'title', pos.title,
        'key', pos.key,
        'is_active', pos.is_active
      )
    ) FILTER (WHERE pos.id IS NOT NULL),
    '[]'::json
  ) AS positions
FROM public.project_members pm
LEFT JOIN public.member_positions mp ON mp.project_member_id = pm.id
LEFT JOIN public.positions pos ON pos.id = mp.position_id
GROUP BY pm.id;
