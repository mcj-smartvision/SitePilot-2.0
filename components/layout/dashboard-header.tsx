'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/auth/logout-button'
import { HeaderLanguageSwitcher } from '@/components/i18n/header-language-switcher'
import { useLocale } from '@/components/i18n/locale-provider'
import { HardHat } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardHeaderProps {
  email: string
  isAdmin: boolean
}

export function DashboardHeader({ email, isAdmin }: DashboardHeaderProps) {
  const { app } = useLocale()
  const pathname = usePathname()

  const navItems = isAdmin
    ? [
        { href: '/admin', label: 'Control Center' },
        { href: '/admin/members', label: 'Members' },
        { href: '/admin/projects', label: 'Projects' },
        { href: '/settings', label: app.settings },
      ]
    : [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/reports', label: app.reports },
        { href: '/settings', label: app.settings },
      ]

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
      <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
        <nav className="flex min-w-0 items-center gap-1 sm:gap-2 overflow-x-auto">
          <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 font-bold shrink-0 mr-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HardHat className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline">SitePilot</span>
          </Link>
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <HeaderLanguageSwitcher />
          <span className="text-sm text-muted-foreground hidden md:inline max-w-[180px] truncate">{email}</span>
          <LogoutButton label={app.signOut} />
        </div>
      </div>
    </header>
  )
}
