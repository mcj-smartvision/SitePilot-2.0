import type { PlanComplianceSummary } from '@/lib/project-manager/plan-compliance'
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

function buildStatusBuckets(compliance: PlanComplianceSummary | null | undefined): ZoneProgress[] {
  if (!compliance || compliance.totalDue === 0) {
    return [
      { zone: 'انجام‌شده', planned: 0, actual: 0, readiness: 0 },
      { zone: 'مطابق برنامه', planned: 0, actual: 0, readiness: 0 },
      { zone: 'عقب از برنامه', planned: 0, actual: 0, readiness: 0 },
      { zone: 'شروع‌نشده', planned: 0, actual: 0, readiness: 0 },
    ]
  }
  const total = compliance.totalDue
  const pct = (n: number) => Math.round((n / total) * 100)
  // planned = share of due set; actual = same count share (single-metric bars)
  return [
    { zone: 'انجام‌شده', planned: pct(compliance.done), actual: pct(compliance.done), readiness: 100 },
    { zone: 'مطابق برنامه', planned: pct(compliance.onTrack), actual: pct(compliance.onTrack), readiness: 85 },
    { zone: 'عقب از برنامه', planned: pct(compliance.behind), actual: pct(compliance.behind), readiness: 40 },
    {
      zone: 'شروع‌نشده (باید شروع)',
      planned: pct(compliance.notStarted),
      actual: pct(compliance.notStarted),
      readiness: 20,
    },
  ]
}

export function buildPmAnalytics(
  projectName: string,
  summary: ProjectScheduleSummary,
  health: ProjectHealthStatus,
  alerts: ProjectAlert[],
  compliance?: PlanComplianceSummary | null
): PmAnalyticsData {
  const behindShare =
    compliance && compliance.totalDue > 0
      ? (compliance.behind + compliance.notStarted) / compliance.totalDue
      : 0

  const wsi = clamp(
    100 -
      summary.delayedTasks * 6 -
      health.shortageManpower * 15 -
      health.criticalDelayedActivities * 4 -
      Math.round(behindShare * 20)
  )
  const mrs = clamp(100 - health.shortageMaterials * 12 - (health.shortageMaterials > 2 ? 10 : 0))
  const varianceGap = Math.max(0, health.plannedProgress - health.actualProgress)
  const csi = clamp(
    100 -
      varianceGap * 2.2 -
      health.scheduleDelayDays * 6 -
      health.criticalDelayedActivities * 4 -
      Math.round(behindShare * 25)
  )

  const spi =
    health.plannedProgress > 0
      ? clamp((health.actualProgress / health.plannedProgress) * 100)
      : health.actualProgress > 0
        ? 100
        : 0

  const kpis: AnalyticsKpi[] = [
    {
      key: 'wsi',
      label: 'WSI',
      value: wsi,
      unit: '/100',
      subtitle: 'کفایت نیرو / پوشش جبهه‌های فعال',
      state: kpiState(wsi, 72, 55),
      trend: summary.delayedTasks > 0 ? -Math.min(20, summary.delayedTasks * 3) : 2,
      threshold: 70,
      sparkline: buildSparkline(wsi, summary.delayedTasks > 0 ? 12 : 4),
    },
    {
      key: 'mrs',
      label: 'MRS',
      value: mrs,
      unit: '/100',
      subtitle: 'آمادگی مصالح (انبار)',
      state: kpiState(mrs, 75, 58),
      trend: health.shortageMaterials > 0 ? -Math.min(18, health.shortageMaterials * 4) : 1,
      threshold: 75,
      sparkline: buildSparkline(mrs, health.shortageMaterials > 0 ? 8 : 3),
    },
    {
      key: 'csi',
      label: 'CSI',
      value: csi,
      unit: '/100',
      subtitle: `یکپارچگی زمان‌بندی · SPI≈${spi}%`,
      state: kpiState(csi, 70, 52),
      trend: varianceGap > 5 ? -Math.min(20, varianceGap) : varianceGap < 0 ? 4 : 0,
      threshold: 72,
      sparkline: buildSparkline(csi, Math.max(3, varianceGap)),
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

  const zoneProgress = buildStatusBuckets(compliance)

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

  const insights: InsightCard[] = []
  if (compliance?.shouldShowChecklist) {
    insights.push({
      id: 'compliance',
      text: `از ${compliance.totalDue} فعالیتِ موعد تا امروز: ${compliance.done} انجام‌شده، ${compliance.onTrack} مطابق، ${compliance.behind} عقب، ${compliance.notStarted} شروع‌نشده`,
      severity: compliance.behind > 0 || compliance.notStarted > 0 ? 'warning' : 'info',
      metric: 'Plan',
    })
  } else {
    insights.push({
      id: 'compliance-gate',
      text: 'چک‌لیست انطباق تا امروز فعال نیست — تاریخ واقعی شروع پروژه را در زمان‌بندی ثبت کنید',
      severity: 'warning',
      metric: 'Plan',
    })
  }
  insights.push({
    id: 'spi',
    text: `SPI تقریبی ${spi}% (واقعی ${health.actualProgress}% در برابر برنامه ${health.plannedProgress}% تا امروز)`,
    severity: spi < 80 ? 'critical' : spi < 95 ? 'warning' : 'info',
    metric: 'CSI',
  })
  if (health.shortageMaterials > 0) {
    insights.push({
      id: 'mrs-stock',
      text: `${health.shortageMaterials} قلم انبار زیر حداقل — MRS=${mrs}`,
      severity: mrs < 58 ? 'critical' : 'warning',
      metric: 'MRS',
    })
  }
  insights.push({
    id: 'risk-week',
    text:
      overallStatus === 'on_track'
        ? 'وضعیت کنترل پروژه پایدار است — روی فعالیت‌های مسیر بحرانی تمرکز کنید'
        : 'ریسک تأخیر بالاست — اولویت با فعالیت‌های عقب‌مانده و تأییدهای باز است',
    severity: overallStatus === 'critical' ? 'critical' : overallStatus === 'at_risk' ? 'warning' : 'info',
  })

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
