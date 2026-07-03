'use client'

import { usePathname } from 'next/navigation'
import { DashboardHeader } from '@/components/layout/dashboard-header'

export function DashboardLayoutShell({
  email,
  isAdmin,
  children,
}: {
  email: string
  isAdmin: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminRoute = pathname.startsWith('/admin')

  if (isAdminRoute) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <DashboardHeader email={email} isAdmin={isAdmin} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
