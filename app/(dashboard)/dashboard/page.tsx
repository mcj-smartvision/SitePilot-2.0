import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchDashboardUserContext } from '@/lib/dashboard/user-context'
import { loadUiBlockVisibility } from '@/lib/dashboard/load-ui-block-visibility'
import { resolvePostLoginPath } from '@/lib/dashboard/redirect'
import { DashboardClient } from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login')

  const context = await fetchDashboardUserContext(supabase, user.id, user.email)
  const postLogin = resolvePostLoginPath(context)

  if (postLogin === '/first-login') redirect('/first-login')
  if (postLogin === '/admin' && context.projects.length === 0) redirect('/admin')

  const visibleBlockCodes = await loadUiBlockVisibility(
    supabase,
    context,
    context.activeProjectId,
    'general'
  )

  return (
    <DashboardClient initialContext={context} visibleBlockCodes={visibleBlockCodes} />
  )
}
