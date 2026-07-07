import {
  calculateKpiStatus,
  calculateOverallStatus,
  formatTrendFa,
  getActionPriority,
  type StatusLevel,
} from '@/lib/managerial/status'
import type { ActionItem, ExecutiveSummary, ManagerialKpi, RiskItem } from '@/lib/managerial/types'
import type { ProjectHealthStatus } from '@/lib/project-manager/types'
import type { ProjectAlert, ProjectScheduleSummary } from '@/types/schedule'

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function buildManagerialSnapshot(
  summary: ProjectScheduleSummary,
  health: ProjectHealthStatus
): {
  projectProgress: number
  plannedProgress: number
  actualProgress: number
  scheduleDelayDays: number
  materialAvailability: number
  manpowerCoverage: number
  equipmentAvailability: number
  safetyRisk: number
  blockersCount: number
} {
  return {
    projectProgress: health.actualProgress,
    plannedProgress: health.plannedProgress,
    actualProgress: health.actualProgress,
    scheduleDelayDays: health.scheduleDelayDays,
    materialAvailability: clamp(100 - health.shortageMaterials * 12),
    manpowerCoverage: clamp(100 - health.shortageManpower * 20 - summary.delayedTasks * 4),
    equipmentAvailability: clamp(88 - summary.delayedTasks * 2),
    safetyRisk: clamp(health.activeHseAlerts * 18 + (health.riskLevel === 'high' ? 25 : 0)),
    blockersCount: health.pendingApprovals + health.criticalDelayedActivities + health.shortageMaterials,
  }
}

export function buildExecutiveSummary(
  summary: ProjectScheduleSummary,
  health: ProjectHealthStatus,
  alerts: ProjectAlert[]
): ExecutiveSummary {
  const snap = buildManagerialSnapshot(summary, health)

  const kpis: ManagerialKpi[] = [
    {
      key: 'wsi',
      labelFa: 'شاخص کفایت نیروی کار (WSI)',
      value: snap.manpowerCoverage,
      unit: 'از ۱۰۰',
      status: calculateKpiStatus(snap.manpowerCoverage, 72, 55),
      explanationFa: 'نشان می‌دهد آیا نیروی انسانی کافی برای فعالیت‌های جاری و پیش‌رو وجود دارد.',
      trendDelta: -18,
      thresholdWarning: 72,
      thresholdCritical: 55,
    },
    {
      key: 'mrs',
      labelFa: 'امتیاز آمادگی مصالح (MRS)',
      value: snap.materialAvailability,
      unit: 'از ۱۰۰',
      status: calculateKpiStatus(snap.materialAvailability, 75, 58),
      explanationFa: 'میزان آمادگی مواد و تأمین برای اجرای برنامه هفتگی — کمبود انبار مستقیم روی این عدد اثر می‌گذارد.',
      trendDelta: -6,
      thresholdWarning: 75,
      thresholdCritical: 58,
    },
    {
      key: 'csi',
      labelFa: 'یکپارچگی کنترل زمان‌بندی (CSI)',
      value: clamp(
        snap.actualProgress -
          (snap.plannedProgress - snap.actualProgress) * 2 -
          snap.scheduleDelayDays * 8
      ),
      unit: 'از ۱۰۰',
      status: calculateKpiStatus(
        clamp(
          snap.actualProgress -
            (snap.plannedProgress - snap.actualProgress) * 2 -
            snap.scheduleDelayDays * 8
        ),
        70,
        52
      ),
      explanationFa: 'سنجش پایبندی به برنامه — فاصله برنامه/واقعی و تأخیر مسیر بحرانی در این شاخص دیده می‌شود.',
      trendDelta: -9,
      thresholdWarning: 70,
      thresholdCritical: 52,
    },
    {
      key: 'safety',
      labelFa: 'ریسک ایمنی',
      value: snap.safetyRisk,
      unit: 'امتیاز',
      status: calculateKpiStatus(snap.safetyRisk, 35, 55, false),
      explanationFa: 'هرچه بالاتر = خطر بیشتر. هشدارهای HSE و رویدادهای میدانی در این عدد تجمیع می‌شوند.',
      trendDelta: 12,
      thresholdWarning: 35,
      thresholdCritical: 55,
    },
  ]

  const overallStatus = calculateOverallStatus(kpis.map((k) => k.status))

  const topRisks: RiskItem[] = []
  if (snap.scheduleDelayDays > 0 || health.criticalDelayedActivities > 0) {
    topRisks.push({
      id: 'delay',
      titleFa: 'خطر تأخیر برنامه',
      detailFa: `${health.criticalDelayedActivities} فعالیت بحرانی در تأخیر — ${snap.scheduleDelayDays} روز انحراف تجمعی`,
      status: snap.scheduleDelayDays > 2 ? 'critical' : 'warning',
    })
  }
  if (snap.manpowerCoverage < 72) {
    topRisks.push({
      id: 'labor',
      titleFa: 'کمبود نیروی کار',
      detailFa: `WSI برابر ${snap.manpowerCoverage} — پوشش نیرو برای جبهه‌های فعال کافی نیست`,
      status: snap.manpowerCoverage < 55 ? 'critical' : 'warning',
    })
  }
  if (snap.materialAvailability < 75 || health.shortageMaterials > 0) {
    topRisks.push({
      id: 'material',
      titleFa: 'تأخیر تأمین مصالح',
      detailFa: `${health.shortageMaterials} قلم زیر حد مجاز انبار — MRS: ${snap.materialAvailability}`,
      status: health.shortageMaterials > 2 ? 'critical' : 'warning',
    })
  }
  for (const alert of alerts.slice(0, 1)) {
    topRisks.push({
      id: alert.id,
      titleFa: 'سیگنال میدانی',
      detailFa: alert.message.slice(0, 100),
      status: alert.severity === 'critical' ? 'critical' : 'warning',
    })
  }
  while (topRisks.length < 3) {
    topRisks.push({
      id: `placeholder-${topRisks.length}`,
      titleFa: 'بدون ریسک جدید',
      detailFa: 'شاخص‌های فعلی در محدوده قابل قبول — پایش مستمر ادامه یابد.',
      status: 'stable',
    })
  }

  const immediateActions: ActionItem[] = [
    {
      id: 'a1',
      titleFa: 'بررسی تأییدهای معلق',
      detailFa: `${health.pendingApprovals} درخواست منتظر تصمیم مدیر پروژه`,
      priority: getActionPriority(health.pendingApprovals > 3 ? 'warning' : 'stable', 'general'),
      href: '/dashboard/project-manager',
    },
    {
      id: 'a2',
      titleFa: 'هماهنگی با سرپرست کارگاه',
      detailFa: 'جلسه ۱۵ دقیقه‌ای برای اولویت‌های امروز و موانع اجرا',
      priority: getActionPriority(topRisks[0]?.status ?? 'stable', 'schedule'),
    },
    {
      id: 'a3',
      titleFa: 'پیگیری تأمین مصالح بحرانی',
      detailFa: health.shortageMaterials > 0 ? 'هماهنگی با انبار و تدارکات برای اقلام کمبود' : 'وضعیت انبار پایدار — بازبینی هفتگی کافی است',
      priority: getActionPriority(
        health.shortageMaterials > 0 ? 'warning' : 'stable',
        'material'
      ),
      href: '/dashboard/procurement',
    },
  ]

  const prioritizedActions: ActionItem[] = [
    ...immediateActions,
    {
      id: 'a4',
      titleFa: 'ثبت گزارش روزانه میدانی',
      detailFa: 'ثبت پیشرفت، موانع و عکس کارگاه برای تحلیل هوشمند',
      priority: 'medium' as const,
      href: '/reports/new',
    },
    {
      id: 'a5',
      titleFa: 'بازبینی مسیر بحرانی',
      detailFa: 'بررسی فعالیت‌های بحرانی در زمان‌بندی و تخصیص منابع',
      priority: getActionPriority(topRisks[0]?.status ?? 'stable', 'schedule'),
      href: '/dashboard/site-supervisor',
    },
  ].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })

  const dailyConclusionFa =
    overallStatus === 'stable'
      ? `پروژه با پیشرفت ${snap.actualProgress}% نسبت به برنامه ${snap.plannedProgress}% در وضعیت پایدار است. تمرکز امروز: حفظ روند و رسیدگی به ${health.pendingApprovals} تأیید معلق.`
      : overallStatus === 'warning'
        ? `پروژه در وضعیت هشدار است. ${formatTrendFa(kpis[0].trendDelta)}. اولویت: رفع کمبود نیرو/مصالح و تصمیم روی درخواست‌های معلق.`
        : `وضعیت بحرانی — تأخیر ${snap.scheduleDelayDays} روزه و ${health.criticalDelayedActivities} فعالیت بحرانی نیازمند مداخله فوری مدیریتی است.`

  return {
    overallStatus,
    dailyConclusionFa,
    topRisks: topRisks.slice(0, 3),
    immediateActions: immediateActions.slice(0, 3),
    prioritizedActions,
    kpis,
  }
}

export function phaseLabelFa(progress: number): string {
  if (progress < 25) return 'آماده‌سازی و استقرار'
  if (progress < 55) return 'اسکلت و سازه'
  if (progress < 85) return 'تأسیسات و نازک‌کاری'
  return 'راه‌اندازی و تحویل'
}
