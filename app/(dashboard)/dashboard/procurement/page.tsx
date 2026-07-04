import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRolePageData } from '@/lib/dashboard/load-role-page'
import { hasRoleDashboardAccess } from '@/lib/schedule/access'
import { PlaceholderRoleDashboard } from '@/components/schedule/placeholder-role-dashboard'

export default async function ProcurementDashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login')

  const { context } = await loadRolePageData(supabase, user.id, user.email)

  if (context.isFirstLogin) redirect('/first-login')
  if (!hasRoleDashboardAccess(context, 'procurement')) redirect('/dashboard')

  return (
    <PlaceholderRoleDashboard
      title="Procurement"
      description="Purchase requests, material lead-time alerts, and vendor orders."
      roleLabel="Procurement Officer"
    >
      <p className="text-sm text-muted-foreground max-w-lg mx-auto">
        Future: purchase requests triggered by schedule alerts (material lead time) or direct requests
        from site supervisor / project manager.
      </p>
    </PlaceholderRoleDashboard>
  )
}
