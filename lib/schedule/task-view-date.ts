import { toIsoDateOnly } from '@/lib/schedule/dates'
import type { ProjectTask } from '@/types/schedule'

export type TaskViewStatus = 'upcoming' | 'active' | 'completed' | 'overdue'

export function taskEffectiveStart(task: ProjectTask): string | null {
  return toIsoDateOnly(task.start_current ?? task.start_planned)
}

export function taskEffectiveFinish(task: ProjectTask): string | null {
  return toIsoDateOnly(task.finish_current ?? task.finish_planned)
}

/** Task status relative to a chosen view date (YYYY-MM-DD). */
export function getTaskViewStatus(task: ProjectTask, viewDateIso: string): TaskViewStatus {
  const start = taskEffectiveStart(task)
  const finish = taskEffectiveFinish(task)
  const pct = Number(task.percent_complete)

  if (start && viewDateIso < start) return 'upcoming'
  if (pct >= 100) return 'completed'
  if (finish && viewDateIso > finish) return 'overdue'
  if (start && viewDateIso >= start) return 'active'
  return 'upcoming'
}

export function filterTasksForViewDate(
  tasks: ProjectTask[],
  viewDateIso: string,
  mode: 'all' | 'relevant' = 'all'
): ProjectTask[] {
  if (mode === 'all') return tasks
  return tasks.filter((task) => {
    const status = getTaskViewStatus(task, viewDateIso)
    return status === 'active' || status === 'overdue' || status === 'completed'
  })
}
