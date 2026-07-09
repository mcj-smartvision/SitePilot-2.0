-- Per-member dashboard UI block preferences (personal layout)
-- Run after migration 37

CREATE TABLE IF NOT EXISTS public.member_ui_block_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  dashboard TEXT NOT NULL,
  block_code TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id, dashboard, block_code)
);

CREATE INDEX IF NOT EXISTS idx_member_ui_block_prefs_user_project
  ON public.member_ui_block_preferences(user_id, project_id, dashboard);

DROP TRIGGER IF EXISTS member_ui_block_preferences_set_updated_at ON public.member_ui_block_preferences;
CREATE TRIGGER member_ui_block_preferences_set_updated_at
  BEFORE UPDATE ON public.member_ui_block_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.member_ui_block_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_ui_block_prefs_select ON public.member_ui_block_preferences;
CREATE POLICY member_ui_block_prefs_select ON public.member_ui_block_preferences
  FOR SELECT USING (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS member_ui_block_prefs_write ON public.member_ui_block_preferences;
CREATE POLICY member_ui_block_prefs_write ON public.member_ui_block_preferences
  FOR ALL USING (user_id = auth.uid() OR public.is_system_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_system_admin());

-- Finance/Admin Officer may access financial tables (same as project accountant)
CREATE OR REPLACE FUNCTION public.is_project_accountant(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members pm
    JOIN public.member_positions mp ON mp.project_member_id = pm.id
    JOIN public.positions pos ON pos.id = mp.position_id
    WHERE pm.user_id = auth.uid()
      AND pm.project_id = p_project_id
      AND pm.is_active = true
      AND pos.key IN ('project_accountant', 'finance_admin')
  ) OR public.is_system_admin();
$$;
