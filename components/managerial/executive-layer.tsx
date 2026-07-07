'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CheckCircle2, ListOrdered } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  getOverallStatusLabel,
  getStatusBgClass,
  getStatusColor,
  getStatusLabel,
  formatTrendFa,
} from '@/lib/managerial/status'
import type { ExecutiveSummary } from '@/lib/managerial/types'
import { cn } from '@/lib/utils'

export function ExecutiveLayer({ summary, projectName, phaseFa }: {
  summary: ExecutiveSummary
  projectName: string
  phaseFa: string
}) {
  const statusClass = getStatusBgClass(summary.overallStatus)

  return (
    <section className="space-y-6" dir="rtl">
      <div className="rounded-2xl border bg-gradient-to-br from-slate-50 to-orange-50/50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              لایه ۱ — خلاصه مدیریتی
            </p>
            <h2 className="text-2xl font-bold">{projectName}</h2>
            <p className="text-sm text-muted-foreground">فاز: {phaseFa}</p>
            <Badge variant="outline" className={cn('font-semibold text-sm px-3 py-1', statusClass)}>
              {getOverallStatusLabel(summary.overallStatus)}
            </Badge>
          </div>
          <div className="rounded-xl border bg-card p-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground mb-1 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              جمع‌بندی امروز
            </p>
            {summary.dailyConclusionFa}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {summary.kpis.slice(0, 3).map((kpi) => (
          <div
            key={kpi.key}
            className="rounded-2xl border bg-card p-5 shadow-sm"
            style={{ borderTopColor: getStatusColor(kpi.status), borderTopWidth: 3 }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug">{kpi.labelFa}</p>
              <Badge variant="outline" className={cn('shrink-0 text-xs', getStatusBgClass(kpi.status))}>
                {getStatusLabel(kpi.status)}
              </Badge>
            </div>
            <p className="text-3xl font-bold mt-2" style={{ color: getStatusColor(kpi.status) }}>
              {kpi.value}
              <span className="text-sm font-normal text-muted-foreground ms-1">{kpi.unit}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{kpi.explanationFa}</p>
            <p className="text-xs mt-2 font-medium">{formatTrendFa(kpi.trendDelta)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            سه ریسک اصلی
          </h3>
          <ul className="space-y-3">
            {summary.topRisks.map((risk, i) => (
              <li key={risk.id} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium">{risk.titleFa}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{risk.detailFa}</p>
                </div>
                <Badge variant="outline" className={cn('ms-auto shrink-0 h-fit text-[10px]', getStatusBgClass(risk.status))}>
                  {getStatusLabel(risk.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <ListOrdered className="h-5 w-5 text-primary" />
            سه اقدام فوری
          </h3>
          <ul className="space-y-3">
            {summary.immediateActions.map((action, i) => (
              <li key={action.id} className="flex gap-3 text-sm items-start">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{action.titleFa}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{action.detailFa}</p>
                </div>
                {action.href ? (
                  <Button asChild variant="ghost" size="sm" className="shrink-0 h-8 px-2">
                    <Link href={action.href}>
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
