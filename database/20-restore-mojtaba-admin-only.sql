-- =====================================================
-- SitePilot: Restore ONLY mojtaba421@gmail.com as system admin
-- Run once in Supabase SQL Editor
-- =====================================================

-- Remove admin roles from everyone except Mojtaba
DELETE FROM public.user_system_roles
WHERE user_id NOT IN (
  SELECT id FROM public.profiles WHERE lower(email) = 'mojtaba421@gmail.com'
);

-- Ensure profile row exists for Mojtaba (from auth.users)
INSERT INTO public.profiles (id, email, full_name, is_active)
SELECT
  u.id,
  lower(u.email),
  COALESCE(u.raw_user_meta_data->>'full_name', 'Mojtaba'),
  true
FROM auth.users u
WHERE lower(u.email) = 'mojtaba421@gmail.com'
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  is_active = true,
  updated_at = now();

-- Grant system_admin to Mojtaba only
INSERT INTO public.user_system_roles (user_id, system_role_id)
SELECT p.id, sr.id
FROM public.profiles p
CROSS JOIN public.system_roles sr
WHERE lower(p.email) = 'mojtaba421@gmail.com'
  AND sr.key = 'system_admin'
  AND sr.is_active = true
ON CONFLICT (user_id, system_role_id) DO NOTHING;

-- RLS helper: ONLY mojtaba421@gmail.com is system admin
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

-- Verify
SELECT p.email, p.full_name, sr.key AS system_role
FROM public.profiles p
LEFT JOIN public.user_system_roles usr ON usr.user_id = p.id
LEFT JOIN public.system_roles sr ON sr.id = usr.system_role_id
WHERE lower(p.email) = 'mojtaba421@gmail.com';
