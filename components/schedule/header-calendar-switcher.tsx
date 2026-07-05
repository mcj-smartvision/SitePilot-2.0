'use client'

import { Calendar } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLocale } from '@/components/i18n/locale-provider'
import { useScheduleCalendar } from '@/hooks/useScheduleCalendar'
import type { ScheduleCalendar } from '@/lib/schedule/calendar-preference'

const CALENDAR_OPTIONS: { value: ScheduleCalendar; labelEn: string; labelFa: string; short: string }[] = [
  { value: 'gregorian', labelEn: 'Gregorian', labelFa: 'میلادی', short: 'G' },
  { value: 'jalali', labelEn: 'Shamsi (Jalali)', labelFa: 'هجری شمسی', short: 'J' },
]

/** Global calendar switcher — same placement pattern as language switcher. */
export function HeaderCalendarSwitcher({ className }: { className?: string }) {
  const { locale, app } = useLocale()
  const fa = locale === 'fa'
  const { calendar, setCalendar } = useScheduleCalendar()
  const current = CALENDAR_OPTIONS.find((o) => o.value === calendar)

  return (
    <div className={className}>
      <Select value={calendar} onValueChange={(v) => setCalendar(v as ScheduleCalendar)}>
        <SelectTrigger
          className="h-9 w-[130px] gap-2 border-muted-foreground/20 bg-background/80"
          aria-label={app.calendar}
        >
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <SelectValue placeholder={app.calendar}>
            <span className="truncate">
              {current ? (fa ? current.labelFa : current.labelEn) : calendar}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {CALENDAR_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="font-medium">{opt.short}</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span>{fa ? opt.labelFa : opt.labelEn}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
