'use client'

import Link from 'next/link'
import { LogoutButton } from '@/components/auth/logout-button'
import { HeaderLanguageSwitcher } from '@/components/i18n/header-language-switcher'
import { useLocale } from '@/components/i18n/locale-provider'

interface DashboardHeaderProps {
  email: string
  isAdmin: boolean
}

export function DashboardHeader({ email, isAdmin }: DashboardHeaderProps) {
  const { app } = useLocale()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
        <nav className="flex min-w-0 items-center gap-4 sm:gap-6 overflow-x-auto">
          <Link href="/" className="font-bold text-lg whitespace-nowrap shrink-0">
            SitePilot
          </Link>
          <Link href="/reports" className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">
            {app.reports}
          </Link>
          <Link href="/reports/new" className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">
            {app.newReport}
          </Link>
          {isAdmin ? (
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">
              {app.admin}
            </Link>
          ) : null}
          <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap">
            {app.settings}
          </Link>
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
