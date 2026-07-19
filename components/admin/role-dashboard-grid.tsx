'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CONSTRUCTION_ROLES, ROLE_DASHBOARD_PREVIEWS } from '@/lib/admin/construction-roles'
import {
  getRoleDashboardRoute,
  ROLE_DASHBOARD_ROUTES,
} from '@/lib/admin/role-dashboard-routes'
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

/** Stable display order for live role dashboards */
const LIVE_DASHBOARD_ORDER = [
  'project_manager',
  'site_supervisor',
  'technical_office',
  'project_accountant',
  'storekeeper',
  'procurement_officer',
  'qa_qc_inspector',
  'hse_officer',
  'security',
] as const

export function RoleDashboardGrid() {
  const [expanded, setExpanded] = useState<string | null>('project_manager')

  const liveRoles = useMemo(() => {
    return LIVE_DASHBOARD_ORDER.map((key) => {
      const role = CONSTRUCTION_ROLES.find((r) => r.key === key)
      const route = ROLE_DASHBOARD_ROUTES[key]
      const preview = ROLE_DASHBOARD_PREVIEWS.find((p) => p.key === key)
      return {
        key,
        title: preview?.title ?? role?.title ?? key,
        route,
        preview,
      }
    }).filter((r) => r.route)
  }, [])

  const comingSoonRoles = useMemo(() => {
    const liveKeys = new Set(Object.keys(ROLE_DASHBOARD_ROUTES))
    return CONSTRUCTION_ROLES.filter((role) => {
      if (liveKeys.has(role.key)) return false
      if (role.key === 'finance_admin') return false
      return !getRoleDashboardRoute(role.key)
    })
  }, [])

  return (
    <div className="space-y-6">
      {/* Quick open — live dashboards only */}
      <div className="rounded-xl border bg-primary/5 p-4 space-y-3">
        <p className="text-sm font-semibold">Live dashboards — open as admin</p>
        <div className="flex flex-wrap gap-2">
          {liveRoles.map((role) => (
            <Link
              key={role.key}
              href={role.route!}
              onClick={() => setExpanded(role.key)}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs font-medium transition-all inline-flex items-center gap-1.5',
                expanded === role.key
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card hover:border-primary/50 hover:bg-primary/10'
              )}
            >
              {role.title}
              <ExternalLink className="h-3 w-3 opacity-70" />
            </Link>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {liveRoles.length} active role dashboards — including Project Accountant (costs).
        </p>
      </div>

      {/* Preview cards — live only */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {liveRoles.map((role) => {
          const preview = role.preview
          if (!preview) return null

          return (
            <div
              key={role.key}
              className={cn(
                'rounded-xl border bg-card shadow-card border-l-4 overflow-hidden transition-all',
                preview.color,
                expanded && expanded !== role.key ? 'opacity-70' : ''
              )}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-semibold text-base">{preview.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{preview.summary}</p>
                  </div>
                  <Link
                    href={role.route!}
                    className="shrink-0 text-primary hover:text-primary/80"
                    title="Open dashboard"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
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
                <Link
                  href={role.route!}
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  View full {preview.title} dashboard
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Coming soon — compact, no fake links */}
      {comingSoonRoles.length > 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-4">
          <p className="text-sm font-medium mb-2">Other site roles (dashboard coming soon)</p>
          <div className="flex flex-wrap gap-2">
            {comingSoonRoles.map((role) => (
              <Badge key={role.key} variant="outline" className="text-xs font-normal text-muted-foreground">
                {role.title}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
