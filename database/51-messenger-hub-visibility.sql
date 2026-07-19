-- =====================================================
-- Fix project hub visibility (general group)
-- Run after 43 / 50 — required for PM dashboard to see «گروه پروژه»
-- =====================================================

ALTER TABLE public.project_conversations
  ADD COLUMN IF NOT EXISTS is_project_hub BOOLEAN NOT NULL DEFAULT false;

-- Creators and all project members can see the project hub group
DROP POLICY IF EXISTS project_conversations_select ON public.project_conversations;
CREATE POLICY project_conversations_select ON public.project_conversations
  FOR SELECT TO authenticated
  USING (
    public.is_system_admin()
    OR public.is_conversation_member(id)
    OR created_by = auth.uid()
    OR (
      public.is_project_member(project_id)
      AND (
        COALESCE(is_project_hub, false) = true
        OR subject = 'گروه پروژه — جلسات و موارد مهم'
      )
    )
  );

-- Bootstrap hub + memberships (bypasses RLS chicken-and-egg)
CREATE OR REPLACE FUNCTION public.ensure_project_messenger_hub(p_project_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hub_id UUID;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT (public.is_system_admin() OR public.is_project_member(p_project_id)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT id INTO v_hub_id
  FROM public.project_conversations
  WHERE project_id = p_project_id
    AND COALESCE(is_project_hub, false) = true
  LIMIT 1;

  IF v_hub_id IS NULL THEN
    SELECT id INTO v_hub_id
    FROM public.project_conversations
    WHERE project_id = p_project_id
      AND kind = 'group'
      AND subject = 'گروه پروژه — جلسات و موارد مهم'
    LIMIT 1;
  END IF;

  IF v_hub_id IS NULL THEN
    INSERT INTO public.project_conversations (
      project_id, kind, subject, created_by, is_project_hub
    ) VALUES (
      p_project_id, 'group', 'گروه پروژه — جلسات و موارد مهم', v_uid, true
    )
    RETURNING id INTO v_hub_id;
  ELSE
    UPDATE public.project_conversations
    SET is_project_hub = true,
        subject = COALESCE(NULLIF(subject, ''), 'گروه پروژه — جلسات و موارد مهم')
    WHERE id = v_hub_id
      AND COALESCE(is_project_hub, false) = false;
  END IF;

  -- Always add caller
  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (v_hub_id, v_uid)
  ON CONFLICT DO NOTHING;

  -- Add all active project members
  INSERT INTO public.conversation_members (conversation_id, user_id)
  SELECT v_hub_id, pm.user_id
  FROM public.project_members pm
  WHERE pm.project_id = p_project_id
    AND pm.is_active = true
    AND pm.user_id IS NOT NULL
  ON CONFLICT DO NOTHING;

  RETURN v_hub_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_project_messenger_hub(UUID) TO authenticated;
