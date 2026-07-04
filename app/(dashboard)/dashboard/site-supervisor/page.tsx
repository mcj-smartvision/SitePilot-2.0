import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRolePageData } from '@/lib/dashboard/load-role-page'
import { hasRoleDashboardAccess } from '@/lib/schedule/access'
import { fetchProjectTasksForWeek } from '@/utils/schedule'
import { SiteSupervisorDashboard } from '@/components/schedule/site-supervisor-dashboard'

export default async function SiteSupervisorPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login')

  const { context, projectOptions, activeProjectId } = await loadRolePageData(
    supabase,
    user.id,
    user.email
  )

  if (context.isFirstLogin) redirect('/first-login')
  if (!hasRoleDashboardAccess(context, 'site-supervisor')) redirect('/dashboard')

  const tasks = activeProjectId
    ? await fetchProjectTasksForWeek(supabase, activeProjectId)
    : []

  return (
    <SiteSupervisorDashboard
      key={activeProjectId ?? 'no-project'}
      initialContext={context}
      projectOptions={projectOptions}
      initialProjectId={activeProjectId}
      initialTasks={tasks}
    />
  )
}
