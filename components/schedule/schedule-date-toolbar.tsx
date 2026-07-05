'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CalendarSystemToggle } from '@/components/schedule/calendar-system-toggle'
import { useScheduleCalendar } from '@/hooks/useScheduleCalendar'
import { useScheduleViewDate } from '@/hooks/useScheduleViewDate'
import { formatScheduleDate } from '@/lib/schedule/dates'
import { useLocale } from '@/components/i18n/locale-provider'

export function ScheduleDateToolbar() {
  const { locale } = useLocale()
  const fa = locale === 'fa'
  const { calendar } = useScheduleCalendar()
  const { viewDate, setViewDate, resetToToday } = useScheduleViewDate()

  const altCalendar = calendar === 'jalali' ? 'gregorian' : 'jalali'

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/20 p-4">
      <CalendarSystemToggle />

      <div className="space-y-1.5 min-w-[200px]">
        <Label htmlFor="schedule-view-date" className="text-xs">
          {fa ? 'مشاهده برنامه در تاریخ' : 'View schedule on date'}
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="schedule-view-date"
            type="date"
            value={viewDate}
            onChange={(e) => setViewDate(e.target.value)}
            className="h-9 w-[160px]"
          />
          <Button type="button" size="sm" variant="outline" className="h-9" onClick={resetToToday}>
            {fa ? 'امروز' : 'Today'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatScheduleDate(viewDate, calendar)}
          {' · '}
          {altCalendar === 'jalali' ? (fa ? 'شمسی' : 'Shamsi') : fa ? 'میلادی' : 'Gregorian'}
          : {formatScheduleDate(viewDate, altCalendar)}
        </p>
      </div>
    </div>
  )
}
