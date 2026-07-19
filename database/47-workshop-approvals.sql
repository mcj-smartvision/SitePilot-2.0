-- =====================================================
-- Workshop package approvals + change requests (PM gate)
-- Editable until PM approves; after that only via change request.
-- Run after migration 46
-- =====================================================

ALTER TABLE public.workshop_packages
  ADD COLUMN IF NOT EXISTS approval_status TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_pm_comment TEXT,
  ADD COLUMN IF NOT EXISTS pending_change JSONB;

UPDATE public.workshop_packages
SET approval_status = COALESCE(approval_status, 'draft')
WHERE approval_status IS NULL;

ALTER TABLE public.workshop_packages
  ALTER COLUMN approval_status SET DEFAULT 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workshop_packages_approval_status_check'
  ) THEN
    ALTER TABLE public.workshop_packages
      ADD CONSTRAINT workshop_packages_approval_status_check
      CHECK (approval_status IN (
        'draft',
        'pending_approval',
        'approved',
        'rejected',
        'change_requested'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workshop_packages_approval
  ON public.workshop_packages(project_id, approval_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.workshop_approval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.workshop_packages(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'submit',
    'approve',
    'reject',
    'comment',
    'change_request',
    'change_approve',
    'change_reject'
  )),
  comment TEXT,
  proposed_change JSONB,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workshop_approval_events_pkg
  ON public.workshop_approval_events(package_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workshop_approval_events_project
  ON public.workshop_approval_events(project_id, created_at DESC);

ALTER TABLE public.workshop_approval_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workshop_approval_events_all ON public.workshop_approval_events;
CREATE POLICY workshop_approval_events_all ON public.workshop_approval_events
  FOR ALL TO authenticated
  USING (public.is_system_admin() OR public.is_project_member(project_id))
  WITH CHECK (public.is_system_admin() OR public.is_project_member(project_id));
