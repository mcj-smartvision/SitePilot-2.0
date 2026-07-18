-- =====================================================
-- Internal project messaging + in-app notifications
-- Run in Supabase SQL Editor after migration 42
-- =====================================================

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Conversations (direct / group / broadcast within a project)
CREATE TABLE IF NOT EXISTS public.project_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'direct'
    CHECK (kind IN ('direct', 'group', 'broadcast')),
  subject TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_conversations_project
  ON public.project_conversations(project_id, updated_at DESC);

-- Members of a conversation
CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id UUID NOT NULL REFERENCES public.project_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON public.conversation_members(user_id, conversation_id);

-- Messages
CREATE TABLE IF NOT EXISTS public.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.project_conversations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('urgent', 'normal', 'info')),
  topic TEXT NOT NULL DEFAULT 'general'
    CHECK (topic IN ('safety', 'materials', 'schedule', 'quality', 'general')),
  pinned BOOLEAN NOT NULL DEFAULT false,
  reply_to_id UUID REFERENCES public.project_messages(id) ON DELETE SET NULL,
  linked_entity_type TEXT,
  linked_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_messages_conversation
  ON public.project_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_messages_project
  ON public.project_messages(project_id, created_at DESC);

DO $$
BEGIN
  CREATE INDEX IF NOT EXISTS idx_project_messages_body_trgm
    ON public.project_messages USING gin (body gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Attachments (images)
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.project_messages(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL DEFAULT 'message-attachments',
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message
  ON public.message_attachments(message_id);

-- In-app notifications (profiles-based; legacy notifications table untouched)
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  notification_type TEXT NOT NULL DEFAULT 'message'
    CHECK (notification_type IN ('message', 'info', 'warning', 'success', 'approval')),
  href TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user
  ON public.app_notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_notifications_project
  ON public.app_notifications(project_id, created_at DESC);

-- Helper: is user an active member of project
CREATE OR REPLACE FUNCTION public.is_active_project_member(p_project_id UUID, p_user_id UUID)
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
      AND pm.user_id = p_user_id
      AND pm.is_active = true
  );
$$;

-- Helper: is current user a member of conversation
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_members cm
    WHERE cm.conversation_id = p_conversation_id
      AND cm.user_id = auth.uid()
  );
$$;

-- Touch conversation.updated_at on new message
CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.project_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_conversation_on_message ON public.project_messages;
CREATE TRIGGER trg_touch_conversation_on_message
  AFTER INSERT ON public.project_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_conversation_on_message();

-- RLS
ALTER TABLE public.project_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

-- Conversations
DROP POLICY IF EXISTS project_conversations_select ON public.project_conversations;
CREATE POLICY project_conversations_select ON public.project_conversations
  FOR SELECT TO authenticated
  USING (
    public.is_system_admin()
    OR public.is_conversation_member(id)
  );

DROP POLICY IF EXISTS project_conversations_insert ON public.project_conversations;
CREATE POLICY project_conversations_insert ON public.project_conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_system_admin()
    OR public.is_project_member(project_id)
  );

DROP POLICY IF EXISTS project_conversations_update ON public.project_conversations;
CREATE POLICY project_conversations_update ON public.project_conversations
  FOR UPDATE TO authenticated
  USING (
    public.is_system_admin()
    OR public.is_conversation_member(id)
  );

-- Conversation members
DROP POLICY IF EXISTS conversation_members_select ON public.conversation_members;
CREATE POLICY conversation_members_select ON public.conversation_members
  FOR SELECT TO authenticated
  USING (
    public.is_system_admin()
    OR user_id = auth.uid()
    OR public.is_conversation_member(conversation_id)
  );

DROP POLICY IF EXISTS conversation_members_insert ON public.conversation_members;
CREATE POLICY conversation_members_insert ON public.conversation_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_system_admin()
    OR EXISTS (
      SELECT 1 FROM public.project_conversations c
      WHERE c.id = conversation_id
        AND public.is_project_member(c.project_id)
    )
  );

DROP POLICY IF EXISTS conversation_members_update ON public.conversation_members;
CREATE POLICY conversation_members_update ON public.conversation_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_system_admin());

-- Messages
DROP POLICY IF EXISTS project_messages_select ON public.project_messages;
CREATE POLICY project_messages_select ON public.project_messages
  FOR SELECT TO authenticated
  USING (
    public.is_system_admin()
    OR public.is_conversation_member(conversation_id)
  );

DROP POLICY IF EXISTS project_messages_insert ON public.project_messages;
CREATE POLICY project_messages_insert ON public.project_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      public.is_system_admin()
      OR public.is_conversation_member(conversation_id)
    )
  );

DROP POLICY IF EXISTS project_messages_update ON public.project_messages;
CREATE POLICY project_messages_update ON public.project_messages
  FOR UPDATE TO authenticated
  USING (
    public.is_system_admin()
    OR public.is_conversation_member(conversation_id)
  );

-- Attachments
DROP POLICY IF EXISTS message_attachments_select ON public.message_attachments;
CREATE POLICY message_attachments_select ON public.message_attachments
  FOR SELECT TO authenticated
  USING (
    public.is_system_admin()
    OR public.is_project_member(project_id)
  );

DROP POLICY IF EXISTS message_attachments_insert ON public.message_attachments;
CREATE POLICY message_attachments_insert ON public.message_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_system_admin()
    OR public.is_project_member(project_id)
  );

-- App notifications
DROP POLICY IF EXISTS app_notifications_select ON public.app_notifications;
CREATE POLICY app_notifications_select ON public.app_notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS app_notifications_insert ON public.app_notifications;
CREATE POLICY app_notifications_insert ON public.app_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_system_admin()
    OR (
      project_id IS NOT NULL
      AND public.is_project_member(project_id)
      AND public.is_active_project_member(project_id, user_id)
    )
  );

DROP POLICY IF EXISTS app_notifications_update ON public.app_notifications;
CREATE POLICY app_notifications_update ON public.app_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_system_admin());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS message_attachments_storage_select ON storage.objects;
CREATE POLICY message_attachments_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS message_attachments_storage_insert ON storage.objects;
CREATE POLICY message_attachments_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS message_attachments_storage_update ON storage.objects;
CREATE POLICY message_attachments_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS message_attachments_storage_delete ON storage.objects;
CREATE POLICY message_attachments_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'message-attachments');

-- Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
