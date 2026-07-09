import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { fetchDashboardUserContext } from '@/lib/dashboard/user-context'
import { PROJECT_COOKIE } from '@/lib/project/project-cookie'
import type { DashboardUserContext } from '@/types/dashboard'

export interface RolePageData {
  context: DashboardUserContext
  projectOptions: { id: string; name: string }[]
  activeProjectId: string | null
}

/** Shared loader for role dashboards (matches storekeeper page pattern). */
export async function loadRolePageData(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<RolePageData> {
  const context = await fetchDashboardUserContext(supabase, userId, email)

  let projectOptions = context.projects.map((p) => ({ id: p.project.id, name: p.project.name }))

  // System admin / finance_admin can switch any active project (header switcher lists all).
  // Without this, cookie changes to a non-membership project are ignored and the table never updates.
  const canSeeAllProjects =
    context.isSystemAdmin || context.positionKeys.includes('finance_admin')

  if (canSeeAllProjects) {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    if (data?.length) {
      projectOptions = data as { id: string; name: string }[]
    }
  }

  const cookieProjectId = cookies().get(PROJECT_COOKIE)?.value ?? null
  const activeProjectId =
    projectOptions.find((p) => p.id === cookieProjectId)?.id ??
    context.activeProjectId ??
    projectOptions[0]?.id ??
    null

  return { context, projectOptions, activeProjectId }
}
