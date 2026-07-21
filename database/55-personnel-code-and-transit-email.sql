-- =====================================================
-- Personnel code + transit email/code snapshots
-- Run after migration 54
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personnel_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_personnel_code_unique
  ON public.profiles (lower(personnel_code))
  WHERE personnel_code IS NOT NULL AND btrim(personnel_code) <> '';

ALTER TABLE public.attendance_transits
  ADD COLUMN IF NOT EXISTS person_email TEXT,
  ADD COLUMN IF NOT EXISTS personnel_code TEXT;

DROP VIEW IF EXISTS public.v_project_members_with_positions;

CREATE VIEW public.v_project_members_with_positions AS
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
  pm.admin_visible_password,
  pm.password_changed_by_member,
  pm.created_at,
  pm.updated_at,
  p.contact_email,
  p.personnel_code,
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
LEFT JOIN public.profiles p ON p.id = pm.user_id
LEFT JOIN public.member_positions mp ON mp.project_member_id = pm.id
LEFT JOIN public.positions pos ON pos.id = mp.position_id
GROUP BY
  pm.id,
  p.contact_email,
  p.personnel_code;
