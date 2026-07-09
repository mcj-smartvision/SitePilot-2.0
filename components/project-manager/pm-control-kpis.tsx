'use client'

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Gauge,
  PackageMinus,
  ShieldAlert,
  Target,
  Timer,
} from 'lucide-react'
import { PmMetricHelpButton } from '@/components/project-manager/pm-metric-help-button'
import type { PlanComplianceSummary } from '@/lib/project-manager/plan-compliance'
import type { ProjectHealthStatus } from '@/lib/project-manager/types'
import type { ProjectScheduleSummary } from '@/types/schedule'
import { cn } from '@/lib/utils'

interface PmControlKpisProps {
  summary: ProjectScheduleSummary
  health: ProjectHealthStatus
  compliance: PlanComplianceSummary | null
  isFa?: boolean
}

function Ring({
  value,
  max = 100,
  color,
  size = 72,
}: {
  value: number
  max?: number
  color: string
  size?: number
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-muted/30" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
    </svg>
  )
}

export function PmControlKpis({ summary, health, compliance, isFa = true }: PmControlKpisProps) {
  const planned = compliance?.avgPlanned ?? health.plannedProgress
  const actual = compliance?.avgActual ?? health.actualProgress
  const variance = actual - planned
  const spi = planned > 0 ? Math.round((actual / planned) * 100) : actual > 0 ? 100 : 0
  const due = compliance?.totalDue ?? 0
  const donePct = due > 0 ? Math.round(((compliance?.done ?? 0) / due) * 100) : 0
  const behindPct = due > 0 ? Math.round(((compliance?.behind ?? 0) / due) * 100) : 0

  const cards = [
    {
      key: 'spi',
      label: isFa ? 'شاخص عملکرد زمان (SPI%)' : 'Schedule Performance (SPI%)',
      value: `${spi}`,
      unit: '%',
      hint:
        spi >= 95
          ? isFa
            ? 'نزدیک یا جلوتر از برنامه'
            : 'Near / ahead of plan'
          : spi >= 80
            ? isFa
              ? 'کمی عقب — نیاز به پیگیری'
              : 'Slightly behind — follow up'
            : isFa
              ? 'عقب‌ماندگی جدی'
              : 'Serious lag',
      color: spi >= 95 ? '#059669' : spi >= 80 ? '#d97706' : '#dc2626',
      icon: Target,
      ring: spi,
    },
    {
      key: 'progress',
      label: isFa ? 'پیشرفت واقعی / برنامه' : 'Actual / Planned progress',
      value: `${actual}`,
      unit: `% / ${planned}%`,
      hint:
        variance >= 0
          ? isFa
            ? `${variance}+٪ جلوتر از برنامه تا امروز`
            : `${variance}+% ahead of plan to date`
          : isFa
            ? `${Math.abs(variance)}٪ عقب از برنامه تا امروز`
            : `${Math.abs(variance)}% behind plan to date`,
      color: variance >= -5 ? '#2563eb' : '#dc2626',
      icon: Gauge,
      ring: actual,
    },
    {
      key: 'compliance',
      label: isFa ? 'انطباق فعالیت‌های تا امروز' : 'Due-activity compliance',
      value: `${donePct}`,
      unit: isFa ? '% انجام‌شده' : '% done',
      hint: isFa
        ? `${compliance?.behind ?? 0} عقب · ${compliance?.onTrack ?? 0} مطابق · ${compliance?.notStarted ?? 0} شروع‌نشده`
        : `${compliance?.behind ?? 0} behind · ${compliance?.onTrack ?? 0} on track · ${compliance?.notStarted ?? 0} not started`,
      color: behindPct > 25 ? '#dc2626' : behindPct > 10 ? '#d97706' : '#059669',
      icon: CheckCircle2,
      ring: Math.max(0, 100 - behindPct),
    },
    {
      key: 'delay',
      label: isFa ? 'تأخیر و مسیر بحرانی' : 'Delay & critical path',
      value: `${health.scheduleDelayDays}`,
      unit: isFa ? 'روز' : 'days',
      hint: isFa
        ? `${summary.delayedTasks} تأخیردار · ${health.criticalDelayedActivities} بحرانی`
        : `${summary.delayedTasks} delayed · ${health.criticalDelayedActivities} critical`,
      color: health.scheduleDelayDays > 2 ? '#dc2626' : health.scheduleDelayDays > 0 ? '#d97706' : '#059669',
      icon: Timer,
      ring: Math.max(0, 100 - health.scheduleDelayDays * 15),
    },
    {
      key: 'materials',
      label: isFa ? 'کمبود مصالح' : 'Material shortages',
      value: `${health.shortageMaterials}`,
      unit: isFa ? 'قلم' : 'items',
      hint: isFa ? 'اقلام زیر حداقل موجودی انبار' : 'Items below warehouse min stock',
      color: health.shortageMaterials > 2 ? '#dc2626' : health.shortageMaterials > 0 ? '#d97706' : '#059669',
      icon: PackageMinus,
      ring: Math.max(0, 100 - health.shortageMaterials * 18),
    },
    {
      key: 'ops',
      label: isFa ? 'عملیات باز' : 'Open operations',
      value: `${health.pendingApprovals}`,
      unit: isFa ? 'تأیید' : 'approvals',
      hint: isFa
        ? `${health.activeHseAlerts} هشدار · ${summary.unresolvedAlerts} باز`
        : `${health.activeHseAlerts} HSE · ${summary.unresolvedAlerts} open alerts`,
      color:
        health.riskLevel === 'high' ? '#dc2626' : health.riskLevel === 'medium' ? '#d97706' : '#059669',
      icon: ClipboardList,
      ring: Math.max(0, 100 - health.pendingApprovals * 12 - health.activeHseAlerts * 10),
    },
  ]

  const riskLabel =
    health.riskLevel === 'high'
      ? isFa
        ? 'ریسک بالا'
        : 'High risk'
      : health.riskLevel === 'medium'
        ? isFa
          ? 'ریسک متوسط'
          : 'Medium risk'
        : isFa
          ? 'ریسک پایین'
          : 'Low risk'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            {isFa ? 'شاخص‌های کنترل پروژه' : 'Project control indicators'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isFa
              ? 'بر اساس برنامه جاری، پیشرفت واقعی و انطباق تا امروز'
              : 'From live schedule, actual progress, and until-today compliance'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PmMetricHelpButton metricId="control-kpis" isFa={isFa} />
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
              health.riskLevel === 'high' && 'bg-red-50 text-red-800 border-red-200',
              health.riskLevel === 'medium' && 'bg-amber-50 text-amber-900 border-amber-200',
              health.riskLevel === 'low' && 'bg-emerald-50 text-emerald-800 border-emerald-200'
            )}
          >
            {health.riskLevel === 'high' ? (
              <ShieldAlert className="h-3.5 w-3.5" />
            ) : health.riskLevel === 'medium' ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {riskLabel}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.key}
              className="relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: `linear-gradient(90deg, ${card.color}, transparent)` }}
              />
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Ring value={card.ring} color={card.color} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="h-4 w-4" style={{ color: card.color }} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-muted-foreground leading-snug">
                    {card.label}
                  </p>
                  <p className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: card.color }}>
                      {card.value}
                    </span>
                    <span className="text-xs text-muted-foreground">{card.unit}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{card.hint}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
