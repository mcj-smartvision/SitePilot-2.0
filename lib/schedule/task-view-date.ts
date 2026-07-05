import { toIsoDateOnly } from '@/lib/schedule/dates'
import type { ProjectTask } from '@/types/schedule'

export type TaskScheduleStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue'

export function taskEffectiveStart(task: ProjectTask): string | null {
  return toIsoDateOnly(task.start_current ?? task.start_planned)
}

export function taskEffectiveFinish(task: ProjectTask): string | null {
  return toIsoDateOnly(task.finish_current ?? task.finish_planned)
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Dynamic task status based on timeline vs as-of date (defaults to today).
 * - not_started: start > asOf
 * - in_progress: asOf within [start, finish]
 * - overdue: finish < asOf and progress < 100%
 * - completed: progress >= 100%
 */
export function getTaskScheduleStatus(
  task: ProjectTask,
  asOfDate: string = todayIso()
): TaskScheduleStatus {
  const start = taskEffectiveStart(task)
  const finish = taskEffectiveFinish(task)
  const pct = Number(task.percent_complete)

  if (pct >= 100) return 'completed'
  if (start && asOfDate < start) return 'not_started'
  if (finish && asOfDate > finish) return 'overdue'
  if (start && finish && asOfDate >= start && asOfDate <= finish) return 'in_progress'
  if (start && asOfDate >= start) return 'in_progress'
  return 'not_started'
}

export const TASK_STATUS_LABELS: Record<
  TaskScheduleStatus,
  { en: string; fa: string }
> = {
  not_started: { en: 'Not Started', fa: 'شروع نشده' },
  in_progress: { en: 'In Progress', fa: 'در جریان' },
  completed: { en: 'Completed', fa: 'تمام شده' },
  overdue: { en: 'Overdue', fa: 'تأخیر' },
}

/** @deprecated use getTaskScheduleStatus */
export type TaskViewStatus = TaskScheduleStatus
export const getTaskViewStatus = getTaskScheduleStatus

export function filterTasksForViewDate(
  tasks: ProjectTask[],
  viewDateIso: string,
  mode: 'all' | 'relevant' = 'all'
): ProjectTask[] {
  if (mode === 'all') return tasks
  return tasks.filter((task) => {
    const status = getTaskScheduleStatus(task, viewDateIso)
    return status === 'in_progress' || status === 'overdue' || status === 'completed'
  })
}
