'use client'

import { StatCard } from '@/components/admin/stat-card'
import type { ProjectHealthStatus } from '@/lib/project-manager/types'
import type { ProjectManagerMessages } from '@/lib/i18n/project-manager'
import { Activity, AlertTriangle, ClipboardCheck, Package, ShieldAlert, TrendingDown } from 'lucide-react'

export function PmKpiCards({ health, t }: { health: ProjectHealthStatus; t: ProjectManagerMessages }) {
  const riskLabel = health.riskLevel === 'high' ? t.high : health.riskLevel === 'medium' ? t.medium : t.low

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={t.progressVsPlan}
        value={`${health.actualProgress}%`}
        icon={TrendingDown}
        trend={`${t.planned}: ${health.plannedProgress}% · ${t.actual}: ${health.actualProgress}%`}
        trendType={health.actualProgress < health.plannedProgress ? 'down' : 'up'}
      />
      <StatCard
        label={t.scheduleDelay}
        value={health.scheduleDelayDays > 0 ? `${health.scheduleDelayDays} ${t.daysLate}` : t.onTime}
        icon={Activity}
        trend={`${t.criticalDelayed}: ${health.criticalDelayedActivities}`}
        trendType={health.scheduleDelayDays > 0 ? 'warning' : 'up'}
      />
      <StatCard
        label={t.pendingApprovals}
        value={health.pendingApprovals}
        icon={ClipboardCheck}
        trend={`${t.materialShortage}: ${health.shortageMaterials}`}
        trendType={health.pendingApprovals > 0 ? 'warning' : 'neutral'}
      />
      <StatCard
        label={t.riskLevel}
        value={riskLabel}
        icon={ShieldAlert}
        trend={`HSE: ${health.activeHseAlerts}`}
        trendType={health.riskLevel === 'high' ? 'down' : health.riskLevel === 'medium' ? 'warning' : 'up'}
      />
    </div>
  )
}

export function ProjectHealthPanel({ health, t }: { health: ProjectHealthStatus; t: ProjectManagerMessages }) {
  return (
    <div className="rounded-xl border bg-card shadow-card p-5 space-y-4">
      <h3 className="font-semibold">{t.projectHealth}</h3>
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-muted-foreground text-xs">{t.progressVsPlan}</p>
          <p className="text-xl font-bold mt-1">
            {health.actualProgress}% <span className="text-sm font-normal text-muted-foreground">/ {health.plannedProgress}%</span>
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-muted-foreground text-xs flex items-center gap-1">
            <Package className="h-3.5 w-3.5" /> {t.materialShortage}
          </p>
          <p className="text-xl font-bold mt-1">{health.shortageMaterials}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-muted-foreground text-xs flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> QC / HSE
          </p>
          <p className="text-xl font-bold mt-1">
            {health.activeQcIssues} / {health.activeHseAlerts}
          </p>
        </div>
      </div>
    </div>
  )
}
