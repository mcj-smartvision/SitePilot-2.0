import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRolePageData } from '@/lib/dashboard/load-role-page'
import { loadUiBlockVisibility } from '@/lib/dashboard/load-ui-block-visibility'
import { hasRoleDashboardAccess } from '@/lib/schedule/access'
import { PlaceholderRoleDashboard } from '@/components/schedule/placeholder-role-dashboard'

export default async function SecurityDashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login')

  const { context, activeProjectId } = await loadRolePageData(supabase, user.id, user.email)

  if (context.isFirstLogin) redirect('/first-login')
  if (!hasRoleDashboardAccess(context, 'security')) redirect('/dashboard')

  const visibleBlockCodes = await loadUiBlockVisibility(
    supabase,
    context,
    activeProjectId,
    'security'
  )

  return (
    <PlaceholderRoleDashboard
      title="Security"
      description="Site access control, entry/exit logs, and live presence."
      roleLabel="Security"
      dashboard="security"
      blockCodes={['SEC-PNL-01']}
      visibleBlockCodes={visibleBlockCodes}
      showAdminBlockCodes={context.isSystemAdmin}
    />
  )
}
