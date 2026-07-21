-- =====================================================
-- Attendance camera binding + face enrollments
-- Run after migration 52
-- =====================================================

ALTER TABLE public.attendance_gates
  ADD COLUMN IF NOT EXISTS camera_device_id TEXT,
  ADD COLUMN IF NOT EXISTS camera_group_id TEXT;

CREATE TABLE IF NOT EXISTS public.attendance_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  person_name TEXT,
  enrolled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_enrollments_project
  ON public.attendance_enrollments(project_id, is_active);

DROP TRIGGER IF EXISTS attendance_enrollments_set_updated_at ON public.attendance_enrollments;
CREATE TRIGGER attendance_enrollments_set_updated_at
  BEFORE UPDATE ON public.attendance_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.attendance_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_enrollments_all ON public.attendance_enrollments;
CREATE POLICY attendance_enrollments_all ON public.attendance_enrollments
  FOR ALL TO authenticated
  USING (public.is_system_admin() OR public.is_project_member(project_id))
  WITH CHECK (public.is_system_admin() OR public.is_project_member(project_id));

INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-faces', 'attendance-faces', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS attendance_faces_select ON storage.objects;
CREATE POLICY attendance_faces_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'attendance-faces');

DROP POLICY IF EXISTS attendance_faces_insert ON storage.objects;
CREATE POLICY attendance_faces_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attendance-faces');

DROP POLICY IF EXISTS attendance_faces_update ON storage.objects;
CREATE POLICY attendance_faces_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'attendance-faces');

DROP POLICY IF EXISTS attendance_faces_delete ON storage.objects;
CREATE POLICY attendance_faces_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'attendance-faces');
