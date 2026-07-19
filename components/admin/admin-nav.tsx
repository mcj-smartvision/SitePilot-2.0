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
import { APP_NAME, APP_PRODUCT_LINE } from '@/lib/brand'
import { LogoutButton } from '@/components/auth/logout-button'
import { HeaderLanguageSwitcher } from '@/components/i18n/header-language-switcher'
import { HeaderCalendarSwitcher } from '@/components/schedule/header-calendar-switcher'
import { HeaderProjectSwitcher } from '@/components/project/header-project-switcher'
import { MessengerButton } from '@/components/messaging/messenger-panel'

const NAV_ITEMS = [
  { href: '/admin', label: 'Control Center', icon: LayoutDashboard, exact: true },
  { href: '/admin/members', label: 'Members', icon: Users, exact: false },
  { href: '/admin/projects', label: 'Projects', icon: FolderKanban, exact: false },
  { href: '/settings', label: 'Settings', icon: Settings, exact: false },
]

export function AdminShell({ children, email }: { children: ReactNode; email?: string }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-[#f4f5f7]">
      <aside className="hidden lg:flex w-[260px] flex-col border-e border-slate-200/80 bg-white shrink-0">
        <div className="flex h-[72px] items-center gap-3 border-b border-slate-100 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0">
            <HardHat className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[15px] leading-tight tracking-tight">{APP_NAME}</p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{APP_PRODUCT_LINE}</p>
          </div>
        </div>

        <div className="space-y-3 border-b border-slate-100 px-4 py-4">
          <HeaderProjectSwitcher className="[&_button]:w-full [&_button]:justify-between" />
          <div className="flex items-center gap-2">
            <MessengerButton />
            <HeaderCalendarSwitcher className="shrink-0" />
            <HeaderLanguageSwitcher className="shrink-0" />
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3 pt-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Administration
          </p>
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                {item.label}
                {active ? <ChevronRight className="h-3.5 w-3.5 ms-auto opacity-70" /> : null}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-100 p-4 space-y-3">
          {email ? (
            <p className="text-xs text-muted-foreground truncate px-1" title={email}>
              {email}
            </p>
          ) : null}
          <LogoutButton label="Sign out" className="w-full" />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-white/95 backdrop-blur px-4">
          <div className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-primary" />
            <span className="font-bold">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-2">
            <MessengerButton />
            <HeaderProjectSwitcher />
            <HeaderCalendarSwitcher />
            <HeaderLanguageSwitcher />
            <LogoutButton label="Out" />
          </div>
        </header>

        <div className="lg:hidden overflow-x-auto border-b bg-white px-2 py-2">
          <nav className="flex gap-1 min-w-max">
            {NAV_ITEMS.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap',
                    active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <main className="flex-1 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 overflow-auto">
          {children}
        </main>
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
    { href: `${base}/widgets`, label: 'Visibility' },
  ]

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Project</p>
        <h2 className="text-lg font-semibold mt-1">{projectName}</h2>
      </div>
      <nav className="flex flex-wrap gap-2">
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
