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

  if (projectOptions.length === 0 && context.isSystemAdmin) {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    projectOptions = (data ?? []) as { id: string; name: string }[]
  }

  const cookieProjectId = cookies().get(PROJECT_COOKIE)?.value ?? null
  const activeProjectId =
    projectOptions.find((p) => p.id === cookieProjectId)?.id ??
    context.activeProjectId ??
    projectOptions[0]?.id ??
    null

  return { context, projectOptions, activeProjectId }
}
