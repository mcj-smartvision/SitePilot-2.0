'use client'

import { usePathname } from 'next/navigation'
import { DashboardHeader } from '@/components/layout/dashboard-header'
import type { RoleNavLink } from '@/lib/dashboard/role-nav'

export function DashboardLayoutShell({
  email,
  isAdmin,
  roleNavLinks = [],
  children,
}: {
  email: string
  isAdmin: boolean
  roleNavLinks?: RoleNavLink[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdminRoute = pathname.startsWith('/admin')

  if (isAdminRoute) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <DashboardHeader email={email} isAdmin={isAdmin} roleNavLinks={roleNavLinks} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
