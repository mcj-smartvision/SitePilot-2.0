import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRolePageData } from '@/lib/dashboard/load-role-page'
import { loadUiBlockVisibility } from '@/lib/dashboard/load-ui-block-visibility'
import { hasRoleDashboardAccess } from '@/lib/schedule/access'
import {
  fetchProjectScheduleSummary,
  fetchRecentDailyReports,
  fetchUnresolvedAlerts,
} from '@/utils/schedule'
import { ProjectManagerDashboard } from '@/components/project-manager/project-manager-dashboard'

export default async function ProjectManagerPage() {
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
  if (!hasRoleDashboardAccess(context, 'project-manager')) redirect('/dashboard')

  const [summary, reports, alerts] = activeProjectId
    ? await Promise.all([
        fetchProjectScheduleSummary(supabase, activeProjectId),
        fetchRecentDailyReports(supabase, activeProjectId),
        fetchUnresolvedAlerts(supabase, activeProjectId),
      ])
    : [
        {
          totalTasks: 0,
          completedTasks: 0,
          delayedTasks: 0,
          criticalTasks: 0,
          overallPercentComplete: 0,
          unresolvedAlerts: 0,
        },
        [],
        [],
      ]

  const visibleBlockCodes = await loadUiBlockVisibility(
    supabase,
    context,
    activeProjectId,
    'project-manager'
  )

  return (
    <ProjectManagerDashboard
      key={activeProjectId ?? 'no-project'}
      initialContext={context}
      projectOptions={projectOptions}
      initialProjectId={activeProjectId}
      initialSummary={summary}
      initialReports={reports}
      initialAlerts={alerts}
      visibleBlockCodes={visibleBlockCodes}
    />
  )
}
