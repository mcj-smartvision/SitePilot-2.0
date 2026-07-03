'use client'

import type { WidgetRenderContext } from '@/types/dashboard'
import { WidgetShell } from '@/components/widgets/widget-shell'
import { Progress } from '@/components/ui/progress'

export function ProgressWidget({ context }: { context: WidgetRenderContext }) {
  const planned = 62
  const actual = 54
  const spi = actual / planned

  return (
    <WidgetShell
      title="Progress Overview"
      description={context.projectId ? 'Planned vs actual cumulative progress' : 'Assign a project to view progress'}
    >
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Planned</span>
            <span>{planned}%</span>
          </div>
          <Progress value={planned} className="h-2" />
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Actual</span>
            <span>{actual}%</span>
          </div>
          <Progress value={actual} className="h-2" />
        </div>
        <div className="flex gap-4 text-sm">
          <Metric label="SPI" value={spi.toFixed(2)} tone={spi >= 1 ? 'good' : 'warn'} />
          <Metric label="Delay" value="8 days" tone="warn" />
          <Metric label="Forecast" value="Q4 2026" />
        </div>
      </div>
    </WidgetShell>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'warn' }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold ${tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : ''}`}>
        {value}
      </p>
    </div>
  )
}
