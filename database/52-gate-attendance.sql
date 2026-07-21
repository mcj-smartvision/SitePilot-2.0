-- =====================================================
-- Gate attendance / transit (person-based, not position)
-- All successful identification events are logged.
-- First IN / last OUT of the day = official entry / exit.
-- Run after migration 51
-- =====================================================

CREATE TABLE IF NOT EXISTS public.attendance_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  camera_label TEXT,
  location_note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_attendance_gates_project
  ON public.attendance_gates(project_id, is_active, sort_order);

DROP TRIGGER IF EXISTS attendance_gates_set_updated_at ON public.attendance_gates;
CREATE TRIGGER attendance_gates_set_updated_at
  BEFORE UPDATE ON public.attendance_gates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.attendance_transits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  gate_id UUID REFERENCES public.attendance_gates(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  source TEXT NOT NULL DEFAULT 'manual_guard'
    CHECK (source IN ('manual_guard', 'manual_self', 'qr', 'camera', 'admin')),
  identification_status TEXT NOT NULL DEFAULT 'success'
    CHECK (identification_status IN ('success', 'failed', 'unauthorized')),
  person_name TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  email_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending', 'sent', 'skipped', 'failed')),
  email_sent_at TIMESTAMPTZ,
  email_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_transits_project_time
  ON public.attendance_transits(project_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_transits_user_time
  ON public.attendance_transits(project_id, user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_transits_status
  ON public.attendance_transits(project_id, identification_status, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.attendance_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transit_id UUID NOT NULL REFERENCES public.attendance_transits(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  provider TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_attendance_email_log_transit
  ON public.attendance_email_log(transit_id, created_at DESC);

ALTER TABLE public.attendance_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_transits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_gates_all ON public.attendance_gates;
CREATE POLICY attendance_gates_all ON public.attendance_gates
  FOR ALL TO authenticated
  USING (public.is_system_admin() OR public.is_project_member(project_id))
  WITH CHECK (public.is_system_admin() OR public.is_project_member(project_id));

DROP POLICY IF EXISTS attendance_transits_all ON public.attendance_transits;
CREATE POLICY attendance_transits_all ON public.attendance_transits
  FOR ALL TO authenticated
  USING (public.is_system_admin() OR public.is_project_member(project_id))
  WITH CHECK (public.is_system_admin() OR public.is_project_member(project_id));

DROP POLICY IF EXISTS attendance_email_log_select ON public.attendance_email_log;
CREATE POLICY attendance_email_log_select ON public.attendance_email_log
  FOR SELECT TO authenticated
  USING (public.is_system_admin() OR public.is_project_member(project_id));

DROP POLICY IF EXISTS attendance_email_log_insert ON public.attendance_email_log;
CREATE POLICY attendance_email_log_insert ON public.attendance_email_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_system_admin() OR public.is_project_member(project_id));

INSERT INTO public.event_types (key, title, description, category) VALUES
  ('attendance.transit', 'Attendance Transit', 'Successful gate identification / transit logged', 'security'),
  ('attendance.failed', 'Attendance Failed ID', 'Gate identification failed or unauthorized', 'security')
ON CONFLICT (key) DO NOTHING;

-- Default gate per active project (idempotent)
INSERT INTO public.attendance_gates (project_id, name, camera_label, location_note, sort_order)
SELECT p.id, 'گیت اصلی', 'دوربین ۱', 'ورودی اصلی کارگاه', 0
FROM public.projects p
WHERE p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.attendance_gates g WHERE g.project_id = p.id
  );
