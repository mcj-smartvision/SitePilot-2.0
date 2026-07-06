'use client'

import { SectionCard } from '@/components/admin/shared'
import { Badge } from '@/components/ui/badge'
import { FormattedDate } from '@/components/schedule/formatted-date'
import { CriticalBadge } from '@/components/schedule/task-status-badge'
import { TrafficLight } from '@/components/supervisor/traffic-light'
import type { LookaheadActivity } from '@/lib/supervisor/types'
import type { SiteSupervisorMessages } from '@/lib/i18n/site-supervisor'
import { cn } from '@/lib/utils'

interface LookaheadPanelProps {
  activities: LookaheadActivity[]
  labels: SiteSupervisorMessages
  isRtl?: boolean
}

function notReady(a: LookaheadActivity): boolean {
  return (
    a.materials_ready !== 'ok' ||
    a.drawings_approved !== 'ok' ||
    a.subcontractor_assigned !== 'ok'
  )
}

export function LookaheadPanel({ activities, labels, isRtl }: LookaheadPanelProps) {
  return (
    <SectionCard title={labels.lookahead}>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{labels.noLookahead}</p>
      ) : (
        <ul className={cn('divide-y', isRtl && 'text-right')}>
          {activities.map((a) => (
            <li
              key={a.id}
              className={cn(
                'py-3 px-1 flex flex-col sm:flex-row sm:items-center gap-2',
                notReady(a) && a.is_critical && 'bg-amber-50/80 dark:bg-amber-950/20 rounded-lg px-2 -mx-2'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium truncate">{a.name}</span>
                  {a.is_critical ? <CriticalBadge /> : null}
                  {notReady(a) ? (
                    <Badge variant="destructive" className="text-xs">
                      {labels.notReady}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {labels.wbs} {a.wbs_code} · <FormattedDate value={a.date_planned_start} />
                </p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <TrafficLight level={a.materials_ready} label={labels.materialsReady} />
                <TrafficLight level={a.drawings_approved} label={labels.drawings} />
                <TrafficLight level={a.subcontractor_assigned} label={labels.assigned} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
