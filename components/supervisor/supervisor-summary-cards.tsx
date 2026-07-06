'use client'

import { TrendingDown, TrendingUp, CalendarDays, ShieldCheck, Activity } from 'lucide-react'
import { StatCard } from '@/components/admin/stat-card'
import type { SupervisorKpis } from '@/lib/supervisor/types'
import type { SiteSupervisorMessages } from '@/lib/i18n/site-supervisor'

interface SupervisorSummaryCardsProps {
  kpis: SupervisorKpis
  labels: SiteSupervisorMessages
}

export function SupervisorSummaryCards({ kpis, labels }: SupervisorSummaryCardsProps) {
  const riskTrend =
    kpis.forecastRisk === 'high' ? 'warning' : kpis.forecastRisk === 'medium' ? 'neutral' : 'up'
  const riskLabel =
    kpis.forecastRisk === 'high'
      ? labels.highRisk
      : kpis.forecastRisk === 'medium'
        ? labels.mediumRisk
        : labels.lowRisk

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={labels.progressVsPlan}
        value={`${kpis.actualPercentToday}%`}
        icon={kpis.delayDays > 0 ? TrendingDown : TrendingUp}
        trend={`${labels.planned}: ${kpis.plannedPercentToday}% · ${labels.actual}: ${kpis.actualPercentToday}%`}
        trendType={kpis.delayDays > 0 ? 'down' : 'up'}
      />
      <StatCard
        label={labels.forecast}
        value={kpis.forecastLabel}
        icon={Activity}
        trend={riskLabel}
        trendType={riskTrend as 'up' | 'down' | 'neutral' | 'warning'}
      />
      <StatCard
        label={labels.todayActivities}
        value={kpis.todayActivitiesTotal}
        icon={CalendarDays}
        trend={`${labels.critical}: ${kpis.todayCritical} · ${labels.overdue}: ${kpis.todayOverdue}`}
        trendType={kpis.todayOverdue > 0 ? 'warning' : 'neutral'}
      />
      <StatCard
        label={labels.readinessScore}
        value={`${kpis.readinessScore}%`}
        icon={ShieldCheck}
        trend={kpis.readinessScore >= 80 ? labels.lowRisk : labels.mediumRisk}
        trendType={kpis.readinessScore >= 80 ? 'up' : 'warning'}
      />
    </div>
  )
}
