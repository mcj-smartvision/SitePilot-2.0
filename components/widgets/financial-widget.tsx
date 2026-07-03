'use client'

import type { WidgetRenderContext } from '@/types/dashboard'
import { WidgetShell } from '@/components/widgets/widget-shell'
import { Progress } from '@/components/ui/progress'

export function FinancialWidget({ context }: { context: WidgetRenderContext }) {
  const budgetUsed = 58

  return (
    <WidgetShell title="Financial Summary" description="High-level contract performance (read-only)">
      {!context.projectId ? (
        <p className="text-sm text-muted-foreground">No project selected.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Contract value</p>
              <p className="font-semibold">$12.4M</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Certified to date</p>
              <p className="font-semibold">$7.2M</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Forecast at completion</p>
              <p className="font-semibold">$12.8M</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Budget consumed</span>
              <span>{budgetUsed}%</span>
            </div>
            <Progress value={budgetUsed} className="h-2" />
          </div>
        </div>
      )}
    </WidgetShell>
  )
}
