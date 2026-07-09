'use client'

import Link from 'next/link'
import { ArrowLeft, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PmMetricHelpButton } from '@/components/project-manager/pm-metric-help-button'
import type { ActionItem } from '@/lib/managerial/types'
import { cn } from '@/lib/utils'

const priorityLabel = {
  high: 'فوری',
  medium: 'مهم',
  low: 'عادی',
}

const priorityClass = {
  high: 'bg-red-500/10 text-red-800 border-red-200',
  medium: 'bg-amber-500/10 text-amber-900 border-amber-200',
  low: 'bg-slate-500/10 text-slate-700 border-slate-200',
}

export function ActionNowBox({ actions }: { actions: ActionItem[] }) {
  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-orange-50/80 to-background p-6 shadow-sm" dir="rtl">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-bold">الان باید چه کار کنم؟</h3>
        </div>
        <PmMetricHelpButton metricId="action-now" isFa />
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        اقدامات اولویت‌دار بر اساس وضعیت فعلی پروژه — از بالا شروع کنید.
      </p>
      <ol className="space-y-3">
        {actions.slice(0, 5).map((action, index) => (
          <li
            key={action.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 text-sm"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              {index + 1}
            </span>
            <div className="flex-1 min-w-[200px]">
              <p className="font-semibold">{action.titleFa}</p>
              <p className="text-xs text-muted-foreground mt-1">{action.detailFa}</p>
            </div>
            <Badge variant="outline" className={cn('text-xs', priorityClass[action.priority])}>
              {priorityLabel[action.priority]}
            </Badge>
            {action.href ? (
              <Button asChild size="sm" variant="outline">
                <Link href={action.href}>
                  انجام
                  <ArrowLeft className="h-3 w-3 ms-1" />
                </Link>
              </Button>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}
