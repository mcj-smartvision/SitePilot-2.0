import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRolePageData } from '@/lib/dashboard/load-role-page'
import { loadUiBlockVisibility } from '@/lib/dashboard/load-ui-block-visibility'
import { hasRoleDashboardAccess } from '@/lib/schedule/access'
import { PlaceholderRoleDashboard } from '@/components/schedule/placeholder-role-dashboard'

export default async function HseDashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login')

  const { context, activeProjectId } = await loadRolePageData(supabase, user.id, user.email)

  if (context.isFirstLogin) redirect('/first-login')
  if (!hasRoleDashboardAccess(context, 'hse')) redirect('/dashboard')

  const visibleBlockCodes = await loadUiBlockVisibility(supabase, context, activeProjectId, 'hse')

  return (
    <PlaceholderRoleDashboard
      title="HSE"
      description="Health, safety, environment monitoring and incident management."
      roleLabel="HSE Officer"
      dashboard="hse"
      blockCodes={['HSE-KPI-01', 'HSE-TBL-01', 'HSE-TBL-02']}
      visibleBlockCodes={visibleBlockCodes}
      showAdminBlockCodes={context.isSystemAdmin}
    />
  )
}
