import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/admin/access'
import { fetchDashboardUserContext } from '@/lib/dashboard/user-context'
import { getRoleNavLinks } from '@/lib/dashboard/role-nav'
import { DashboardLayoutShell } from '@/components/layout/dashboard-layout-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = await isSystemAdmin(supabase, user.id)
  const context = await fetchDashboardUserContext(supabase, user.id, user.email ?? '')
  const roleNavLinks = getRoleNavLinks(context)

  return (
    <DashboardLayoutShell email={user.email ?? ''} isAdmin={admin} roleNavLinks={roleNavLinks}>
      {children}
    </DashboardLayoutShell>
  )
}
