'use client'

import Link from 'next/link'
import { CONSTRUCTION_ROLES } from '@/lib/admin/construction-roles'
import { getRoleDashboardRoute } from '@/lib/admin/role-dashboard-routes'
import type { ProjectMember } from '@/types/admin'
import { cn } from '@/lib/utils'

function dutySummary(positionKey: string, positionTitle: string): string {
  const role = CONSTRUCTION_ROLES.find((r) => r.key === positionKey)
  return role?.description ?? positionTitle
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** Checkerboard of defined members + short duty summary — nothing else. */
export function RoleDashboardGrid({ members }: { members: ProjectMember[] }) {
  const rows = members
    .slice()
    .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email, 'fa'))

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        هنوز عضوی تعریف نشده است.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {rows.map((member, index) => {
          const positions = member.positions ?? []
          const primary = positions[0]
          const duty = primary
            ? dutySummary(primary.key, primary.title)
            : 'سمت تعریف نشده'
          const roleTitles = positions.map((p) => p.title).join(' · ') || '—'
          const dashboardHref = primary ? getRoleDashboardRoute(primary.key) : null
          const memberHref = `/admin/projects/${member.project_id}/members`
          const href = dashboardHref ?? memberHref
          // Chessboard: (row + col) on 2-column grid
          const row = Math.floor(index / 2)
          const col = index % 2
          const dark = (row + col) % 2 === 1

          return (
            <Link
              key={member.id}
              href={href}
              className={cn(
                'flex gap-3 border-b border-e border-slate-200 p-4 transition-colors hover:bg-amber-50/70',
                dark ? 'bg-slate-100' : 'bg-white',
                !member.is_active && 'opacity-55'
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  dark ? 'bg-white text-slate-700' : 'bg-slate-200/90 text-slate-700'
                )}
              >
                {initials(member.full_name || member.email || '?')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {member.full_name || member.email}
                </p>
                <p className="text-xs font-medium text-slate-600 mt-0.5 truncate">{roleTitles}</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                  {duty}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
