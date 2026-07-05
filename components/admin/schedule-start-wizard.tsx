'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarSystemToggle } from '@/components/schedule/calendar-system-toggle'
import { formatScheduleDate, diffDaysIso } from '@/lib/schedule/dates'
import { useScheduleCalendar } from '@/hooks/useScheduleCalendar'
import type { ScheduleStartAnalysis } from '@/lib/schedule/apply-actual-start'
import { useLocale } from '@/components/i18n/locale-provider'
import { CheckCircle2, Loader2, CalendarClock } from 'lucide-react'

interface ScheduleStartWizardProps {
  projectId: string
  baselineStart: string
  onComplete?: () => void
}

export function ScheduleStartWizard({ projectId, baselineStart, onComplete }: ScheduleStartWizardProps) {
  const router = useRouter()
  const { locale } = useLocale()
  const { calendar } = useScheduleCalendar()
  const fa = locale === 'fa'

  const [step, setStep] = useState<'question' | 'date' | 'done'>('question')
  const [actualStart, setActualStart] = useState(baselineStart)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ScheduleStartAnalysis | null>(null)

  async function submit(aligned: boolean) {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/schedule/apply-actual-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          aligned_with_baseline: aligned,
          actual_start_date: aligned ? baselineStart : actualStart,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to apply start date')

      setAnalysis(data.analysis)
      setStep('done')
      router.refresh()
      onComplete?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const shiftPreview =
    step === 'date' && actualStart ? diffDaysIso(baselineStart, actualStart) : 0

  return (
    <Card className="border-primary/30 shadow-card">
      <CardHeader className="border-b bg-primary/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              {fa ? 'تأیید تاریخ شروع پروژه' : 'Confirm project start date'}
            </CardTitle>
            <CardDescription className="mt-1">
              {fa
                ? 'پس از import، تاریخ شروع واقعی را مشخص کنید تا برنامه به‌روز شود.'
                : 'After import, set the actual start so the schedule shifts correctly.'}
            </CardDescription>
          </div>
          <CalendarSystemToggle />
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <p className="text-sm">
          {fa ? 'شروع برنامه (baseline MSP):' : 'Schedule baseline start:'}{' '}
          <strong>{formatScheduleDate(baselineStart, calendar)}</strong>
          <span className="text-muted-foreground text-xs ml-2">({baselineStart})</span>
        </p>

        {step === 'question' ? (
          <div className="space-y-4">
            <p className="font-medium">
              {fa
                ? 'آیا شروع واقعی پروژه مطابق همین زمان‌بندی است؟'
                : 'Does the actual project start match this schedule?'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={loading} onClick={() => submit(true)}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {fa ? 'بله — مطابق است' : 'Yes — matches baseline'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => setStep('date')}
              >
                {fa ? 'خیر — تاریخ دیگر' : 'No — different date'}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'date' ? (
          <div className="space-y-4">
            <p className="font-medium">
              {fa ? 'تاریخ شروع واقعی پروژه را وارد کنید:' : 'Enter the actual project start date:'}
            </p>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="actual-start">{fa ? 'تاریخ (میلادی)' : 'Date (Gregorian)'}</Label>
              <Input
                id="actual-start"
                type="date"
                value={actualStart}
                onChange={(e) => setActualStart(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {fa ? 'شمسی:' : 'Shamsi:'}{' '}
                <strong>{formatScheduleDate(actualStart, 'jalali')}</strong>
                {shiftPreview !== 0 ? (
                  <>
                    {' '}
                    · {fa ? 'جابجایی' : 'Shift'}: {shiftPreview > 0 ? '+' : ''}
                    {shiftPreview} {fa ? 'روز' : 'days'}
                  </>
                ) : null}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={loading || !actualStart} onClick={() => submit(false)}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {fa ? 'اعمال و به‌روزرسانی برنامه' : 'Apply & update schedule'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStep('question')}>
                {fa ? 'بازگشت' : 'Back'}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 'done' && analysis ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
            <p className="text-sm font-medium text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {fa ? 'برنامه به‌روز شد' : 'Schedule updated'}
            </p>
            <ul className="text-sm text-emerald-900/90 space-y-1">
              <li>
                {fa ? 'شروع واقعی:' : 'Actual start:'}{' '}
                {formatScheduleDate(analysis.actual_start, calendar)}
              </li>
              <li>
                {fa ? 'جابجایی:' : 'Shift:'} {analysis.shift_days}{' '}
                {fa ? 'روز' : 'days'}
              </li>
              <li>
                {fa ? 'تسک‌ها:' : 'Tasks:'} {analysis.tasks_updated} · {fa ? 'در جریان' : 'in progress'}:{' '}
                {analysis.tasks_in_progress} · {fa ? 'تمام' : 'done'}: {analysis.tasks_completed}
              </li>
              <li>
                {fa ? 'تأخیر' : 'Delayed'}: {analysis.tasks_delayed} · {fa ? 'پیشرفت کل' : 'Overall'}:{' '}
                {analysis.overall_percent}%
              </li>
            </ul>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
