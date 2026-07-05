'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  readScheduleCalendar,
  writeScheduleCalendar,
  type ScheduleCalendar,
} from '@/lib/schedule/calendar-preference'

export function useScheduleCalendar() {
  const [calendar, setCalendarState] = useState<ScheduleCalendar>('gregorian')

  useEffect(() => {
    setCalendarState(readScheduleCalendar())
  }, [])

  const setCalendar = useCallback((next: ScheduleCalendar) => {
    setCalendarState(next)
    writeScheduleCalendar(next)
  }, [])

  return { calendar, setCalendar }
}
