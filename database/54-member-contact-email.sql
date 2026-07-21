-- =====================================================
-- Real contact email on profiles (notifications / login migration)
-- Run after migration 53
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_contact_email
  ON public.profiles (lower(contact_email))
  WHERE contact_email IS NOT NULL;

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
  p.contact_email;
