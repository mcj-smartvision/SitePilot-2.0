import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadRolePageData } from '@/lib/dashboard/load-role-page'
import { hasRoleDashboardAccess } from '@/lib/schedule/access'
import { PlaceholderRoleDashboard } from '@/components/schedule/placeholder-role-dashboard'

export default async function HseDashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login')

  const { context } = await loadRolePageData(supabase, user.id, user.email)

  if (context.isFirstLogin) redirect('/first-login')
  if (!hasRoleDashboardAccess(context, 'hse')) redirect('/dashboard')

  return (
    <PlaceholderRoleDashboard
      title="HSE"
      description="Health, safety, environment monitoring and incident management."
      roleLabel="HSE Officer"
    >
      <p className="text-sm text-muted-foreground max-w-lg mx-auto">
        Full HSE dashboard (hazards, incidents, toolbox talks) is next on the roadmap.
      </p>
    </PlaceholderRoleDashboard>
  )
}
