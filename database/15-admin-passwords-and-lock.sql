-- =====================================================
-- SitePilot: Admin lock + member passwords + default positions
-- Run in Supabase SQL Editor
-- =====================================================

-- Only mojtaba421@gmail.com is system admin
DELETE FROM public.user_system_roles
WHERE user_id NOT IN (
  SELECT id FROM public.profiles WHERE lower(email) = 'mojtaba421@gmail.com'
);

INSERT INTO public.user_system_roles (user_id, system_role_id)
SELECT p.id, sr.id
FROM public.profiles p
CROSS JOIN public.system_roles sr
WHERE lower(p.email) = 'mojtaba421@gmail.com'
  AND sr.key = 'system_admin'
ON CONFLICT (user_id, system_role_id) DO NOTHING;

-- Store admin-visible password (last password set by admin)
ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS admin_visible_password TEXT,
  ADD COLUMN IF NOT EXISTS password_changed_by_member BOOLEAN NOT NULL DEFAULT false;

-- Stricter admin check: only mojtaba421@gmail.com
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_system_roles usr
    JOIN public.system_roles sr ON sr.id = usr.system_role_id
    JOIN public.profiles p ON p.id = usr.user_id
    WHERE usr.user_id = auth.uid()
      AND lower(p.email) = 'mojtaba421@gmail.com'
      AND sr.is_active = true
      AND sr.key IN ('system_admin', 'it_admin')
  );
$$;

-- Updated view with password fields for admin UI
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
LEFT JOIN public.member_positions mp ON mp.project_member_id = pm.id
LEFT JOIN public.positions pos ON pos.id = mp.position_id
GROUP BY pm.id;
