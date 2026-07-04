import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRolePageData } from '@/lib/dashboard/load-role-page'
import { hasRoleDashboardAccess } from '@/lib/schedule/access'
import { PlaceholderRoleDashboard } from '@/components/schedule/placeholder-role-dashboard'

export default async function SecurityDashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login')

  const { context } = await loadRolePageData(supabase, user.id, user.email)

  if (context.isFirstLogin) redirect('/first-login')
  if (!hasRoleDashboardAccess(context, 'security')) redirect('/dashboard')

  return (
    <PlaceholderRoleDashboard
      title="Security"
      description="Site access control, entry/exit logs, and live presence."
      roleLabel="Security"
    >
      <p className="text-sm text-muted-foreground max-w-lg mx-auto">
        Future: attendance logs, gate access, and real-time headcount on site.
      </p>
    </PlaceholderRoleDashboard>
  )
}
