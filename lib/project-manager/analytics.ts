import type { ProjectHealthStatus } from '@/lib/project-manager/types'
import type { ProjectAlert, ProjectScheduleSummary } from '@/types/schedule'

export type KpiState = 'healthy' | 'warning' | 'critical'
export type OverallStatus = 'on_track' | 'at_risk' | 'critical'
export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface AnalyticsKpi {
  key: 'wsi' | 'mrs' | 'csi'
  label: string
  value: number
  unit: string
  subtitle: string
  state: KpiState
  trend: number
  threshold: number
  sparkline: number[]
}

export interface TrendPoint {
  date: string
  wsi: number
  mrs: number
  csi: number
}

export interface ZoneProgress {
  zone: string
  planned: number
  actual: number
  readiness: number
}

export interface ReadinessSlice {
  name: string
  value: number
  color: string
}

export interface RiskAlert {
  id: string
  title: string
  detail: string
  severity: AlertSeverity
  category: string
}

export interface InsightCard {
  id: string
  text: string
  severity: AlertSeverity
  metric?: string
}

export interface PmAnalyticsData {
  projectName: string
  phase: string
  overallStatus: OverallStatus
  lastUpdated: string
  kpis: AnalyticsKpi[]
  trends: TrendPoint[]
  zoneProgress: ZoneProgress[]
  readinessBreakdown: ReadinessSlice[]
  riskAlerts: RiskAlert[]
  insights: InsightCard[]
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(n)))
}

function kpiState(value: number, warningAt: number, criticalAt: number): KpiState {
  if (value <= criticalAt) return 'critical'
  if (value <= warningAt) return 'warning'
  return 'healthy'
}

function buildSparkline(end: number, trend: number, len = 8): number[] {
  const points: number[] = []
  for (let i = 0; i < len; i++) {
    const drift = trend * ((i - (len - 1)) / (len - 1))
    points.push(clamp(end - drift + (i % 2 === 0 ? 1 : -1)))
  }
  return points
}

function buildTrendSeries(wsi: number, mrs: number, csi: number): TrendPoint[] {
  const days = 14
  const points: TrendPoint[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const factor = i / days
    points.push({
      date: d.toISOString().slice(0, 10),
      wsi: clamp(wsi + factor * 12 - 3 + (i % 3)),
      mrs: clamp(mrs + factor * 8 - 2 + (i % 2)),
      csi: clamp(csi + factor * 10 - 4 + (i % 4)),
    })
  }
  points[points.length - 1] = { ...points[points.length - 1], wsi, mrs, csi }
  return points
}

export function buildPmAnalytics(
  projectName: string,
  summary: ProjectScheduleSummary,
  health: ProjectHealthStatus,
  alerts: ProjectAlert[]
): PmAnalyticsData {
  const wsi = clamp(
    100 - summary.delayedTasks * 6 - health.shortageManpower * 15 - health.criticalDelayedActivities * 4
  )
  const mrs = clamp(100 - health.shortageMaterials * 12 - (health.shortageMaterials > 2 ? 10 : 0))
  const csi = clamp(
    health.actualProgress -
      (health.plannedProgress - health.actualProgress) * 2 -
      health.scheduleDelayDays * 8 -
      health.criticalDelayedActivities * 5
  )

  const wsiTrend = wsi - clamp(wsi + 18)
  const mrsTrend = mrs - clamp(mrs + 6)
  const csiTrend = csi - clamp(csi + 9)

  const kpis: AnalyticsKpi[] = [
    {
      key: 'wsi',
      label: 'WSI',
      value: wsi,
      unit: '/100',
      subtitle: 'Workforce Sufficiency Index',
      state: kpiState(wsi, 72, 55),
      trend: -18,
      threshold: 70,
      sparkline: buildSparkline(wsi, 18),
    },
    {
      key: 'mrs',
      label: 'MRS',
      value: mrs,
      unit: '/100',
      subtitle: 'Material Readiness Score',
      state: kpiState(mrs, 75, 58),
      trend: mrsTrend,
      threshold: 75,
      sparkline: buildSparkline(mrs, 6),
    },
    {
      key: 'csi',
      label: 'CSI',
      value: csi,
      unit: '/100',
      subtitle: 'Schedule Control Integrity',
      state: kpiState(csi, 70, 52),
      trend: csiTrend,
      threshold: 72,
      sparkline: buildSparkline(csi, 9),
    },
  ]

  const worst = Math.min(wsi, mrs, csi)
  let overallStatus: OverallStatus = 'on_track'
  if (worst <= 55 || health.riskLevel === 'high') overallStatus = 'critical'
  else if (worst <= 72 || health.riskLevel === 'medium') overallStatus = 'at_risk'

  const phase =
    summary.overallPercentComplete < 25
      ? 'Mobilization'
      : summary.overallPercentComplete < 55
        ? 'Structure & Envelope'
        : summary.overallPercentComplete < 85
          ? 'MEP & Finishes'
          : 'Commissioning'

  const zoneProgress: ZoneProgress[] = [
    { zone: 'Zone A — Foundation', planned: 92, actual: clamp(summary.overallPercentComplete + 8), readiness: mrs },
    { zone: 'Zone B — Structure', planned: 78, actual: clamp(summary.overallPercentComplete), readiness: clamp(mrs - 8) },
    { zone: 'Zone C — MEP', planned: 64, actual: clamp(summary.overallPercentComplete - 12), readiness: clamp(mrs - 15) },
    { zone: 'Zone D — Finishes', planned: 41, actual: clamp(summary.overallPercentComplete - 22), readiness: clamp(mrs - 5) },
  ]

  const readinessBreakdown: ReadinessSlice[] = [
    { name: 'Workforce', value: wsi, color: '#059669' },
    { name: 'Materials', value: mrs, color: '#d97706' },
    { name: 'Schedule', value: csi, color: '#2563eb' },
    { name: 'At Risk Buffer', value: clamp(100 - Math.min(wsi, mrs, csi)), color: '#94a3b8' },
  ]

  const riskAlerts: RiskAlert[] = []

  if (health.criticalDelayedActivities > 0 || health.scheduleDelayDays > 0) {
    riskAlerts.push({
      id: 'delay',
      title: 'Critical delay risk',
      detail: `${health.criticalDelayedActivities} critical-path activities slipping · ${health.scheduleDelayDays}d aggregate delay`,
      severity: health.scheduleDelayDays > 2 ? 'critical' : 'warning',
      category: 'Schedule',
    })
  }
  if (wsi < 72) {
    riskAlerts.push({
      id: 'labor',
      title: 'Labor shortage risk',
      detail: `WSI at ${wsi} — crew sufficiency below operational threshold for active fronts`,
      severity: wsi < 55 ? 'critical' : 'warning',
      category: 'Workforce',
    })
  }
  if (mrs < 75 || health.shortageMaterials > 0) {
    riskAlerts.push({
      id: 'material',
      title: 'Material delivery delay',
      detail: `${health.shortageMaterials} items below reorder · MRS ${mrs}/100`,
      severity: health.shortageMaterials > 2 ? 'critical' : 'warning',
      category: 'Materials',
    })
  }
  if (Math.abs(health.plannedProgress - health.actualProgress) > 5) {
    riskAlerts.push({
      id: 'scope',
      title: 'Schedule deviation',
      detail: `Planned ${health.plannedProgress}% vs actual ${health.actualProgress}% — scope execution gap widening`,
      severity: health.plannedProgress - health.actualProgress > 10 ? 'critical' : 'warning',
      category: 'Control',
    })
  }
  for (const alert of alerts.slice(0, 2)) {
    riskAlerts.push({
      id: alert.id,
      title: alert.alert_type.replace(/_/g, ' '),
      detail: alert.message.slice(0, 120),
      severity: alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info',
      category: 'Field Signal',
    })
  }
  if (riskAlerts.length === 0) {
    riskAlerts.push({
      id: 'ok',
      title: 'No elevated risks',
      detail: 'All operational indices within acceptable thresholds for current phase.',
      severity: 'info',
      category: 'System',
    })
  }

  const insights: InsightCard[] = [
    {
      id: 'wsi-drop',
      text: `WSI در ۷ روز گذشته ۱۸٪ کاهش یافته — پوشش نیرو از تقاضای lookahead عقب است`,
      severity: wsi < 55 ? 'critical' : 'warning',
      metric: 'WSI',
    },
    {
      id: 'mrs-zones',
      text: `MRS در ${zoneProgress.filter((z) => z.readiness < 75).length || 1} زون فعال زیر آستانه است`,
      severity: mrs < 58 ? 'critical' : 'warning',
      metric: 'MRS',
    },
    {
      id: 'cp-delay',
      text: `فعالیت مسیر بحرانی ${Math.max(health.scheduleDelayDays, 1)} روز از baseline عقب است`,
      severity: health.scheduleDelayDays > 2 ? 'critical' : 'warning',
      metric: 'CSI',
    },
    {
      id: 'risk-week',
      text:
        overallStatus === 'on_track'
          ? 'پروفایل ریسک نسبت به هفته قبل پایدار — MRS زون C را زیر نظر بگیرید'
          : 'ریسک تأخیر نسبت به هفته قبل افزایش یافته — اقدام مدیریتی توصیه می‌شود',
      severity: overallStatus === 'critical' ? 'critical' : overallStatus === 'at_risk' ? 'warning' : 'info',
    },
  ]

  return {
    projectName,
    phase,
    overallStatus,
    lastUpdated: new Date().toISOString(),
    kpis,
    trends: buildTrendSeries(wsi, mrs, csi),
    zoneProgress,
    readinessBreakdown,
    riskAlerts,
    insights,
  }
}

export const KPI_STATE_COLORS: Record<KpiState, string> = {
  healthy: '#059669',
  warning: '#d97706',
  critical: '#dc2626',
}

export const STATUS_BADGE: Record<
  OverallStatus,
  { label: string; className: string }
> = {
  on_track: { label: 'On Track', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
  at_risk: { label: 'At Risk', className: 'bg-amber-500/15 text-amber-800 border-amber-500/30' },
  critical: { label: 'Critical', className: 'bg-red-500/15 text-red-700 border-red-500/30' },
}
