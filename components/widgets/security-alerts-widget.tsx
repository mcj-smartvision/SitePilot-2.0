'use client'

import type { WidgetRenderContext } from '@/types/dashboard'
import { WidgetShell } from '@/components/widgets/widget-shell'

const ALERTS = [
  { time: '09:14', message: 'Unauthorized vehicle at Gate B', level: 'high' },
  { time: '11:02', message: 'Night shift patrol check overdue', level: 'medium' },
  { time: '14:30', message: 'PPE violation logged — Zone C', level: 'low' },
]

export function SecurityAlertsWidget({ context }: { context: WidgetRenderContext }) {
  return (
    <WidgetShell title="Security Alerts" description="Recent security notifications">
      {!context.projectId ? (
        <p className="text-sm text-muted-foreground">No project selected.</p>
      ) : (
        <ul className="space-y-2">
          {ALERTS.map((alert) => (
            <li key={alert.time + alert.message} className="rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{alert.message}</span>
                <span className="text-xs text-muted-foreground shrink-0">{alert.time}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
