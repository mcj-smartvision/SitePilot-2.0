-- =====================================================
-- SitePilot: Create admin user "sahar" with full access
-- Run in Supabase SQL Editor AFTER creating the auth user
-- =====================================================
--
-- STEP 1 (Supabase Dashboard — required for password hashing):
--   Authentication → Users → Add user → Create new user
--   Email:    sahar@site.local   (internal — user logs in with username: sahar)
--   Password: 6288
--   Auto Confirm User: ON
--
-- Login on site: username = sahar   password = 6288
--
-- STEP 2: Run this SQL block in SQL Editor
-- =====================================================

-- Ensure profile exists and is active
INSERT INTO public.profiles (id, email, full_name, is_active, is_first_login)
SELECT
  u.id,
  lower(u.email),
  COALESCE(u.raw_user_meta_data->>'full_name', 'Sahar'),
  true,
  false
FROM auth.users u
WHERE lower(u.email) = lower('sahar@site.local')
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  is_active = true,
  is_first_login = false,
  updated_at = now();

-- Grant system_admin role (full platform admin)
INSERT INTO public.user_system_roles (user_id, system_role_id)
SELECT p.id, sr.id
FROM public.profiles p
CROSS JOIN public.system_roles sr
WHERE lower(p.email) = lower('sahar@site.local')
  AND sr.key = 'system_admin'
  AND sr.is_active = true
ON CONFLICT (user_id, system_role_id) DO NOTHING;

-- Optional: also grant it_admin if you use that role key
INSERT INTO public.user_system_roles (user_id, system_role_id)
SELECT p.id, sr.id
FROM public.profiles p
CROSS JOIN public.system_roles sr
WHERE lower(p.email) = lower('sahar@site.local')
  AND sr.key = 'it_admin'
  AND sr.is_active = true
ON CONFLICT (user_id, system_role_id) DO NOTHING;

-- Fix RLS helper: allow ANY user with system_admin/it_admin role (not email-locked)
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
    WHERE usr.user_id = auth.uid()
      AND sr.is_active = true
      AND sr.key IN ('system_admin', 'it_admin')
  );
$$;

-- Verify
SELECT
  p.email,
  p.full_name,
  sr.key AS system_role
FROM public.profiles p
JOIN public.user_system_roles usr ON usr.user_id = p.id
JOIN public.system_roles sr ON sr.id = usr.system_role_id
WHERE lower(p.email) = lower('sahar@site.local');
