'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/admin/shared'
import { FormattedDate } from '@/components/schedule/formatted-date'
import type { ApprovalItem, DepartmentSummary, ActivityFeedItem } from '@/lib/project-manager/types'
import type { ProjectManagerMessages } from '@/lib/i18n/project-manager'
import { cn } from '@/lib/utils'

function priorityVariant(p: ApprovalItem['priority']) {
  if (p === 'critical') return 'destructive' as const
  if (p === 'high') return 'secondary' as const
  return 'outline' as const
}

export function ApprovalCenter({
  items,
  t,
  isRtl,
  onView,
  loadingId,
}: {
  items: ApprovalItem[]
  t: ProjectManagerMessages
  isRtl?: boolean
  onView: (item: ApprovalItem) => void
  loadingId?: string | null
}) {
  return (
    <SectionCard title={t.approvalCenter}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{t.noPending}</p>
      ) : (
        <div className={cn('divide-y', isRtl && 'text-right')}>
          {items.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-1">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.title}</span>
                  <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
                  <Badge variant="outline">{item.sourceDepartment}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                <p className="text-xs text-muted-foreground">
                  <FormattedDate value={item.createdAt.slice(0, 10)} />
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" disabled={loadingId === item.id} onClick={() => onView(item)}>
                {t.view}
              </Button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

export function DepartmentOverviewGrid({
  departments,
  t,
}: {
  departments: DepartmentSummary[]
  t: ProjectManagerMessages
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{t.departments}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((d) => (
          <div key={d.key} className="rounded-xl border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending: {d.pendingCount} · Issues: {d.issueCount}
                </p>
              </div>
              <Badge variant={d.status === 'critical' ? 'destructive' : d.status === 'warning' ? 'secondary' : 'outline'}>
                {d.status}
              </Badge>
            </div>
            {d.href ? (
              <Link href={d.href} className="text-xs text-primary hover:underline mt-3 inline-block">
                {t.openDashboard} →
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ActivityFeedPanel({ items, t }: { items: ActivityFeedItem[]; t: ProjectManagerMessages }) {
  return (
    <SectionCard title={t.activityFeed}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">—</p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id} className="py-2.5 text-sm">
              <p>{item.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <FormattedDate value={item.createdAt.slice(0, 10)} /> · {item.type}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
