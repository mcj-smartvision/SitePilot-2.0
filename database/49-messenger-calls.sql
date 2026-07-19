-- =====================================================
-- Messenger call signaling (voice / video)
-- Run after migration 43
-- =====================================================

CREATE TABLE IF NOT EXISTS public.messenger_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.project_conversations(id) ON DELETE CASCADE,
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media TEXT NOT NULL DEFAULT 'audio' CHECK (media IN ('audio', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing'
    CHECK (status IN ('ringing', 'accepted', 'ended', 'rejected', 'missed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messenger_calls_callee
  ON public.messenger_calls(callee_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messenger_calls_conversation
  ON public.messenger_calls(conversation_id, created_at DESC);

ALTER TABLE public.messenger_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messenger_calls_select ON public.messenger_calls;
CREATE POLICY messenger_calls_select ON public.messenger_calls
  FOR SELECT TO authenticated
  USING (
    public.is_system_admin()
    OR caller_id = auth.uid()
    OR callee_id = auth.uid()
  );

DROP POLICY IF EXISTS messenger_calls_insert ON public.messenger_calls;
CREATE POLICY messenger_calls_insert ON public.messenger_calls
  FOR INSERT TO authenticated
  WITH CHECK (
    caller_id = auth.uid()
    AND (
      public.is_system_admin()
      OR public.is_conversation_member(conversation_id)
    )
  );

DROP POLICY IF EXISTS messenger_calls_update ON public.messenger_calls;
CREATE POLICY messenger_calls_update ON public.messenger_calls
  FOR UPDATE TO authenticated
  USING (
    public.is_system_admin()
    OR caller_id = auth.uid()
    OR callee_id = auth.uid()
  );

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messenger_calls;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
