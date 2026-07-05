export type ScheduleCalendar = 'gregorian' | 'jalali'

export const SCHEDULE_CALENDAR_KEY = 'sitepilot_schedule_calendar'

export function readScheduleCalendar(): ScheduleCalendar {
  if (typeof window === 'undefined') return 'gregorian'
  const v = localStorage.getItem(SCHEDULE_CALENDAR_KEY)
  return v === 'jalali' ? 'jalali' : 'gregorian'
}

export function writeScheduleCalendar(calendar: ScheduleCalendar) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SCHEDULE_CALENDAR_KEY, calendar)
}
