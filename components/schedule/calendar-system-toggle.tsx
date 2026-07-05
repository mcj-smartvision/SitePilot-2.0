'use client'

import { Button } from '@/components/ui/button'
import { useScheduleCalendar } from '@/hooks/useScheduleCalendar'
import { Calendar } from 'lucide-react'
import { useLocale } from '@/components/i18n/locale-provider'
import { cn } from '@/lib/utils'

export function CalendarSystemToggle({ className }: { className?: string }) {
  const { locale } = useLocale()
  const fa = locale === 'fa'
  const { calendar, setCalendar } = useScheduleCalendar()

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="inline-flex rounded-lg border bg-muted/30 p-0.5">
        <Button
          type="button"
          size="sm"
          variant={calendar === 'gregorian' ? 'default' : 'ghost'}
          className="h-8 px-3 text-xs"
          onClick={() => setCalendar('gregorian')}
        >
          {fa ? 'میلادی' : 'Gregorian'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={calendar === 'jalali' ? 'default' : 'ghost'}
          className="h-8 px-3 text-xs"
          onClick={() => setCalendar('jalali')}
        >
          {fa ? 'شمسی' : 'Shamsi'}
        </Button>
      </div>
    </div>
  )
}
