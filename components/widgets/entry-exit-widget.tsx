'use client'

import type { WidgetRenderContext } from '@/types/dashboard'
import { WidgetShell } from '@/components/widgets/widget-shell'
import { Button } from '@/components/ui/button'

const LOGS = [
  { name: 'Ali Rezaei', type: 'IN', time: '07:42', badge: 'Contractor' },
  { name: 'Delivery truck #4421', type: 'IN', time: '08:15', badge: 'Vehicle' },
  { name: 'Sara Mohammadi', type: 'OUT', time: '12:03', badge: 'Staff' },
  { name: 'Visitor — HSE audit', type: 'IN', time: '13:20', badge: 'Visitor' },
]

export function EntryExitWidget({ context }: { context: WidgetRenderContext }) {
  return (
    <WidgetShell
      title="Entry / Exit Logs"
      description="Gate activity for today"
      action={<Button size="sm" variant="outline">Log entry</Button>}
    >
      {!context.projectId ? (
        <p className="text-sm text-muted-foreground">No project selected.</p>
      ) : (
        <ul className="space-y-2">
          {LOGS.map((log) => (
            <li key={`${log.name}-${log.time}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{log.name}</p>
                <p className="text-xs text-muted-foreground">{log.badge}</p>
              </div>
              <div className="text-right">
                <p className={log.type === 'IN' ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                  {log.type}
                </p>
                <p className="text-xs text-muted-foreground">{log.time}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
