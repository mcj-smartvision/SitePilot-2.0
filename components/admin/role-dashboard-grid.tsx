'use client'

import { useState } from 'react'
import { ROLE_DASHBOARD_PREVIEWS } from '@/lib/admin/construction-roles'
import { CONSTRUCTION_ROLES } from '@/lib/admin/construction-roles'
import { cn } from '@/lib/utils'
import { ChevronRight, TrendingDown, TrendingUp, Minus, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
  warning: AlertTriangle,
}

const trendColors = {
  up: 'text-emerald-600',
  down: 'text-red-600',
  neutral: 'text-muted-foreground',
  warning: 'text-amber-600',
}

export function RoleDashboardGrid() {
  const [expanded, setExpanded] = useState<string | null>('project_manager')
  const allRoles = CONSTRUCTION_ROLES

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {allRoles.slice(0, 12).map((role) => (
          <button
            key={role.key}
            type="button"
            onClick={() => setExpanded(expanded === role.key ? null : role.key)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
              expanded === role.key
                ? 'border-primary bg-primary/10 text-primary'
                : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            {role.title}
          </button>
        ))}
        <span className="self-center text-xs text-muted-foreground">+{allRoles.length - 12} more roles</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ROLE_DASHBOARD_PREVIEWS.map((preview) => (
          <div
            key={preview.key}
            className={cn(
              'rounded-xl border bg-card shadow-card border-l-4 overflow-hidden transition-all',
              preview.color,
              expanded && expanded !== preview.key && expanded !== null ? 'opacity-60' : ''
            )}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-semibold text-base">{preview.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{preview.summary}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {preview.metrics.map((metric) => {
                  const TrendIcon = metric.trend ? trendIcons[metric.trend] : Minus
                  return (
                    <div key={metric.label} className="rounded-lg bg-muted/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-sm font-semibold">{metric.value}</p>
                        {metric.trend ? (
                          <TrendIcon className={cn('h-3 w-3', trendColors[metric.trend])} />
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>

              {preview.alerts.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="admin-section-title">Active alerts</p>
                  {preview.alerts.map((alert) => (
                    <div key={alert} className="flex items-start gap-2 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="text-foreground/80">{alert}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="border-t bg-muted/20 px-5 py-2.5">
              <button type="button" className="text-xs font-medium text-primary hover:underline">
                View full {preview.title} dashboard →
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-sm font-medium mb-2">All site roles — access summary</p>
        <div className="flex flex-wrap gap-2">
          {allRoles.map((role) => (
            <Badge key={role.key} variant="outline" className="text-xs font-normal">
              {role.title}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
