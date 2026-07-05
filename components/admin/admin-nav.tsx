'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Settings,
  HardHat,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoutButton } from '@/components/auth/logout-button'
import { HeaderLanguageSwitcher } from '@/components/i18n/header-language-switcher'
import { HeaderCalendarSwitcher } from '@/components/schedule/header-calendar-switcher'
import { HeaderProjectSwitcher } from '@/components/project/header-project-switcher'

const NAV_ITEMS = [
  { href: '/admin', label: 'Control Center', icon: LayoutDashboard, exact: true },
  { href: '/admin/members', label: 'Members', icon: Users, exact: false },
  { href: '/admin/projects', label: 'Projects', icon: FolderKanban, exact: false },
  { href: '/settings', label: 'Settings', icon: Settings, exact: false },
]

export function AdminShell({ children, email }: { children: ReactNode; email?: string }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-[calc(100vh-0px)] bg-muted/30">
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card shrink-0">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <HardHat className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">SitePilot</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Operations</p>
          </div>
          <HeaderCalendarSwitcher className="shrink-0 hidden xl:block" />
          <HeaderLanguageSwitcher className="shrink-0" />
        </div>

        <div className="border-b px-3 py-3">
          <HeaderProjectSwitcher className="[&_button]:w-full" />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <p className="admin-section-title px-3 py-2">Administration</p>
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
                {active ? <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-70" /> : null}
              </Link>
            )
          })}
        </nav>

        <div className="border-t p-4 space-y-3">
          {email ? (
            <p className="text-xs text-muted-foreground truncate px-1" title={email}>
              {email}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <LogoutButton label="Sign out" className="flex-1" />
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card/95 backdrop-blur px-4">
          <div className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-primary" />
            <span className="font-bold">SitePilot Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <HeaderProjectSwitcher />
            <HeaderCalendarSwitcher />
            <HeaderLanguageSwitcher />
            <LogoutButton label="Out" />
          </div>
        </header>

        <div className="lg:hidden overflow-x-auto border-b bg-card px-2 py-2">
          <nav className="flex gap-1 min-w-max">
            {NAV_ITEMS.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

interface ProjectNavProps {
  projectId: string
  projectName: string
}

export function ProjectAdminNav({ projectId, projectName }: ProjectNavProps) {
  const pathname = usePathname()
  const base = `/admin/projects/${projectId}`

  const items = [
    { href: `${base}/members`, label: 'Members' },
    { href: `${base}/positions`, label: 'Positions' },
    { href: `${base}/schedule`, label: 'Schedule' },
    { href: `${base}/routing`, label: 'Notifications' },
    { href: `${base}/widgets`, label: 'Widgets' },
  ]

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div>
        <p className="admin-section-title">Project</p>
        <h2 className="text-lg font-semibold mt-0.5">{projectName}</h2>
      </div>
      <nav className="flex flex-wrap gap-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
