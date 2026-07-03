import type { SupabaseClient } from '@supabase/supabase-js'
import type { SystemRole } from '@/types/admin'

const ADMIN_ROLE_KEYS = ['system_admin', 'it_admin'] as const

function normalizeRole(row: { system_role: unknown }) {
  const value = row.system_role
  if (Array.isArray(value)) return value[0] as { key: string; is_active: boolean } | undefined
  return value as { key: string; is_active: boolean } | null
}

export async function isSystemAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_system_roles')
    .select('system_role:system_roles(key, is_active)')
    .eq('user_id', userId)

  if (error) return false

  return (data ?? []).some((row) => {
    const role = normalizeRole(row)
    return role?.is_active && ADMIN_ROLE_KEYS.includes(role.key as (typeof ADMIN_ROLE_KEYS)[number])
  })
}

export async function getUserSystemRoles(
  supabase: SupabaseClient,
  userId: string
): Promise<SystemRole[]> {
  const { data, error } = await supabase
    .from('user_system_roles')
    .select('system_role:system_roles(*)')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  return (data ?? [])
    .map((row) => normalizeRole(row) as SystemRole | null)
    .filter((role): role is SystemRole => Boolean(role?.is_active))
}

export function slugifyKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
