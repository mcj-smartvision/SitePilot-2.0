import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/admin/access'
import { LogoutButton } from '@/components/auth/logout-button'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = await isSystemAdmin(supabase, user.id)

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <nav className="flex items-center gap-4 sm:gap-6 overflow-x-auto">
            <Link href="/" className="font-bold text-lg whitespace-nowrap">
              SitePilot
            </Link>
            <Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">
              Reports
            </Link>
            <Link href="/reports/new" className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">
              New Report
            </Link>
            {admin ? (
              <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">
                Admin
              </Link>
            ) : null}
            <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">
              Settings
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
