'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ROLE_DASHBOARD_PREVIEWS } from '@/lib/admin/construction-roles'
import { CONSTRUCTION_ROLES } from '@/lib/admin/construction-roles'
import { getRoleDashboardRoute, ROLE_DASHBOARD_ROUTES } from '@/lib/admin/role-dashboard-routes'
import { cn } from '@/lib/utils'
import { ChevronRight, TrendingDown, TrendingUp, Minus, AlertTriangle, ExternalLink } from 'lucide-react'
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
        {allRoles.slice(0, 12).map((role) => {
          const route = getRoleDashboardRoute(role.key)
          const isSelected = expanded === role.key

          if (route) {
            return (
              <Link
                key={role.key}
                href={route}
                onClick={() => setExpanded(role.key)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all inline-flex items-center gap-1',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {role.title}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </Link>
            )
          }

          return (
            <button
              key={role.key}
              type="button"
              onClick={() => setExpanded(expanded === role.key ? null : role.key)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
              )}
            >
              {role.title}
            </button>
          )
        })}
        <span className="self-center text-xs text-muted-foreground">+{allRoles.length - 12} more roles</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ROLE_DASHBOARD_PREVIEWS.map((preview) => {
          const route = getRoleDashboardRoute(preview.key)

          return (
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
                  {route ? (
                    <Link href={route} className="shrink-0 text-primary hover:text-primary/80" title="Open dashboard">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
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
                {route ? (
                  <Link href={route} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
                    View full {preview.title} dashboard
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground cursor-default">
                    {preview.title} dashboard — coming soon
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-sm font-medium mb-2">All site roles — open dashboard</p>
        <div className="flex flex-wrap gap-2">
          {allRoles.map((role) => {
            const route = getRoleDashboardRoute(role.key)
            if (route) {
              return (
                <Link key={role.key} href={route}>
                  <Badge
                    variant="default"
                    className="text-xs font-normal cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    {role.title} →
                  </Badge>
                </Link>
              )
            }
            return (
              <Badge key={role.key} variant="outline" className="text-xs font-normal text-muted-foreground">
                {role.title}
              </Badge>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Highlighted roles have a live dashboard. As system admin you can open any of them without switching
          accounts ({Object.keys(ROLE_DASHBOARD_ROUTES).length} available).
        </p>
      </div>
    </div>
  )
}
