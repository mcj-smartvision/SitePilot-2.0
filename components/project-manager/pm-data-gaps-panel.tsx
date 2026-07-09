'use client'

import Link from 'next/link'
import { AlertCircle, CheckCircle2, CircleAlert, Database, ExternalLink } from 'lucide-react'
import type { PmDataGap } from '@/lib/project-manager/data-gaps'
import { cn } from '@/lib/utils'

interface PmDataGapsPanelProps {
  gaps: PmDataGap[]
  isFa?: boolean
}

export function PmDataGapsPanel({ gaps, isFa = true }: PmDataGapsPanelProps) {
  const missing = gaps.filter((g) => g.status !== 'ok')
  const okCount = gaps.filter((g) => g.status === 'ok').length

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 border-b px-5 py-4 bg-gradient-to-l from-slate-50 to-card">
        <Database className="h-5 w-5 text-slate-700 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">
            {isFa ? 'وضعیت داده برای گزارش کامل' : 'Data readiness for full reporting'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {isFa
              ? 'اگر داده‌ای نیست، صریحاً نوشته شده و مسیر وارد کردن آن مشخص است تا شاخص‌ها دقیق شوند.'
              : 'Missing inputs are called out with where to enter them so KPIs become accurate.'}
          </p>
          <p className="text-xs mt-2">
            <span className="font-medium text-emerald-700">
              {okCount} {isFa ? 'آماده' : 'ready'}
            </span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="font-medium text-amber-700">
              {missing.length} {isFa ? 'نیاز به تکمیل' : 'need attention'}
            </span>
          </p>
        </div>
      </div>

      <ul className="divide-y">
        {gaps.map((gap) => {
          const title = isFa ? gap.titleFa : gap.titleEn
          const detail = isFa ? gap.detailFa : gap.detailEn
          const where = isFa ? gap.whereFa : gap.whereEn
          const Icon =
            gap.status === 'ok'
              ? CheckCircle2
              : gap.severity === 'critical'
                ? AlertCircle
                : CircleAlert

          return (
            <li key={gap.id} className="px-5 py-3.5 flex gap-3">
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 mt-0.5',
                  gap.status === 'ok'
                    ? 'text-emerald-600'
                    : gap.severity === 'critical'
                      ? 'text-red-600'
                      : 'text-amber-600'
                )}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{title}</p>
                  <span
                    className={cn(
                      'text-[10px] font-medium rounded-full border px-2 py-0.5',
                      gap.status === 'ok' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      gap.status === 'missing' && 'bg-red-50 text-red-800 border-red-200',
                      gap.status === 'partial' && 'bg-amber-50 text-amber-900 border-amber-200'
                    )}
                  >
                    {gap.status === 'ok'
                      ? isFa
                        ? 'موجود'
                        : 'OK'
                      : gap.status === 'partial'
                        ? isFa
                          ? 'ناقص'
                          : 'Partial'
                        : isFa
                          ? 'نیست'
                          : 'Missing'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
                {gap.status !== 'ok' ? (
                  <p className="text-xs">
                    <span className="text-muted-foreground">{isFa ? 'از کجا:' : 'Where:'}</span>{' '}
                    {gap.href ? (
                      <Link
                        href={gap.href}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        {where}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="font-medium">{where}</span>
                    )}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
