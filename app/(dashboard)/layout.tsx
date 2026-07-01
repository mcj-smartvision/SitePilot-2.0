import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/admin/access'
import { DashboardHeader } from '@/components/layout/dashboard-header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = await isSystemAdmin(supabase, user.id)

  return (
    <div className="min-h-screen bg-muted/20">
      <DashboardHeader email={user.email ?? ''} isAdmin={admin} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
