'use client'

import { formatScheduleDate, formatScheduleDateTime } from '@/lib/schedule/dates'
import { useScheduleCalendar } from '@/hooks/useScheduleCalendar'

interface FormattedDateProps {
  value: string | null | undefined
  /** Include time portion (default: date only). */
  dateTime?: boolean
  className?: string
}

/** Renders a date using the global calendar preference (Gregorian / Shamsi). */
export function FormattedDate({ value, dateTime = false, className }: FormattedDateProps) {
  const { calendar } = useScheduleCalendar()
  const text = dateTime ? formatScheduleDateTime(value, calendar) : formatScheduleDate(value, calendar)
  return <span className={className}>{text}</span>
}
