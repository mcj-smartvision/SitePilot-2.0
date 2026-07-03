import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/admin/access'
import { DashboardLayoutShell } from '@/components/layout/dashboard-layout-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = await isSystemAdmin(supabase, user.id)

  return (
    <DashboardLayoutShell email={user.email ?? ''} isAdmin={admin}>
      {children}
    </DashboardLayoutShell>
  )
}
