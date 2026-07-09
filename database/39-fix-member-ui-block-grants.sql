-- Fix grants + RLS for member_ui_block_preferences (toggle save was failing)
-- Run after migration 38

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_ui_block_preferences TO authenticated;
GRANT ALL ON public.member_ui_block_preferences TO service_role;

DROP POLICY IF EXISTS member_ui_block_prefs_write ON public.member_ui_block_preferences;

DROP POLICY IF EXISTS member_ui_block_prefs_insert ON public.member_ui_block_preferences;
CREATE POLICY member_ui_block_prefs_insert ON public.member_ui_block_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS member_ui_block_prefs_update ON public.member_ui_block_preferences;
CREATE POLICY member_ui_block_prefs_update ON public.member_ui_block_preferences
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_system_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS member_ui_block_prefs_delete ON public.member_ui_block_preferences;
CREATE POLICY member_ui_block_prefs_delete ON public.member_ui_block_preferences
  FOR DELETE USING (user_id = auth.uid() OR public.is_system_admin());
