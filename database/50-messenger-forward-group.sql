-- =====================================================
-- Messenger: forward metadata + project hub group marker
-- Run after migration 43 / 49
-- =====================================================

ALTER TABLE public.project_conversations
  ADD COLUMN IF NOT EXISTS is_project_hub BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_conversations_hub_unique
  ON public.project_conversations(project_id)
  WHERE is_project_hub = true;

ALTER TABLE public.project_messages
  ADD COLUMN IF NOT EXISTS forwarded_from_id UUID REFERENCES public.project_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_messages_forwarded
  ON public.project_messages(forwarded_from_id)
  WHERE forwarded_from_id IS NOT NULL;

-- Note: for hub group visibility on PM dashboard, also run
-- database/51-messenger-hub-visibility.sql
