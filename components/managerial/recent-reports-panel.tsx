'use client'

import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormattedDate } from '@/components/schedule/formatted-date'
import type { SiteDailyReport } from '@/types/schedule'

export function RecentReportsPanel({ reports }: { reports: SiteDailyReport[] }) {
  const recent = reports.slice(0, 4)

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden" dir="rtl">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">گزارش‌های اخیر / آرشیو</h3>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/reports">مشاهده همه</Link>
        </Button>
      </div>
      <div className="p-4 space-y-2">
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">هنوز گزارشی ثبت نشده.</p>
        ) : (
          recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">گزارش روزانه — {r.report_date}</p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {r.summary_text ?? r.raw_text.slice(0, 80)}
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ms-2">
                <FormattedDate value={r.created_at} dateTime />
              </span>
            </div>
          ))
        )}
        <Button asChild className="w-full mt-2" variant="secondary">
          <Link href="/reports/new">
            <Plus className="h-4 w-4 ms-2" />
            ثبت گزارش جدید
          </Link>
        </Button>
      </div>
    </div>
  )
}
