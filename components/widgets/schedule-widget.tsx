'use client'

import type { WidgetRenderContext } from '@/types/dashboard'
import { WidgetShell } from '@/components/widgets/widget-shell'

const MILESTONES = [
  { name: 'Foundation complete', date: 'Apr 12', status: 'done' },
  { name: 'Level 3 slab pour', date: 'May 03', status: 'active' },
  { name: 'MEP rough-in start', date: 'May 28', status: 'upcoming' },
  { name: 'Facade closure', date: 'Jul 15', status: 'upcoming' },
]

export function ScheduleWidget({ context }: { context: WidgetRenderContext }) {
  return (
    <WidgetShell title="Schedule" description="Upcoming baseline milestones">
      {!context.projectId ? (
        <p className="text-sm text-muted-foreground">Upload a baseline schedule to enable milestones.</p>
      ) : (
        <ul className="space-y-2">
          {MILESTONES.map((item) => (
            <li key={item.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>{item.name}</span>
              <span className="text-muted-foreground">{item.date}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
