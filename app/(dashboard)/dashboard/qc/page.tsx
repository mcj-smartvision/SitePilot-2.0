import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRolePageData } from '@/lib/dashboard/load-role-page'
import { loadUiBlockVisibility } from '@/lib/dashboard/load-ui-block-visibility'
import { hasRoleDashboardAccess } from '@/lib/schedule/access'
import { QcDashboard } from '@/components/qc/qc-dashboard'

export default async function QcDashboardPage() {
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
  if (!hasRoleDashboardAccess(context, 'qc')) redirect('/dashboard')

  const visibleBlockCodes = await loadUiBlockVisibility(supabase, context, activeProjectId, 'qc')

  return (
    <QcDashboard
      key={activeProjectId ?? 'no-project'}
      initialContext={context}
      projectOptions={projectOptions}
      initialProjectId={activeProjectId}
      visibleBlockCodes={visibleBlockCodes}
    />
  )
}
