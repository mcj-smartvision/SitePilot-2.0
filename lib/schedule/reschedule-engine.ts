import { addDaysIso, diffDaysIso, toIsoDateOnly } from '@/lib/schedule/dates'
import type { ProjectTask, TaskDependency, TaskRelationType } from '@/types/schedule'

export interface RescheduledTaskDates {
  start: string
  finish: string
}

export interface RebuildScheduleResult {
  taskDates: Map<string, RescheduledTaskDates>
  projectStart: string
  baselineStart: string
}

function taskDurationDays(start: string | null, finish: string | null): number {
  const startIso = toIsoDateOnly(start)
  const finishIso = toIsoDateOnly(finish)
  if (!startIso || !finishIso) return 1
  return Math.max(1, diffDaysIso(startIso, finishIso) + 1)
}

function finishFromStart(startIso: string, durationDays: number): string {
  return addDaysIso(startIso, durationDays - 1)
}

function toTimestamp(isoDate: string): string {
  return `${isoDate}T12:00:00.000Z`
}

function applyDependencyConstraint(
  relation: TaskRelationType,
  lagDays: number,
  predStart: string,
  predFinish: string,
  durationDays: number,
  currentStart: string,
  currentFinish: string
): { start: string; finish: string } {
  let es = currentStart
  let ef = currentFinish

  switch (relation) {
    case 'FS': {
      const bound = addDaysIso(predFinish, lagDays)
      if (bound > es) {
        es = bound
        ef = finishFromStart(es, durationDays)
      }
      break
    }
    case 'SS': {
      const bound = addDaysIso(predStart, lagDays)
      if (bound > es) {
        es = bound
        ef = finishFromStart(es, durationDays)
      }
      break
    }
    case 'FF': {
      const bound = addDaysIso(predFinish, lagDays)
      if (bound > ef) {
        ef = bound
        es = addDaysIso(ef, -(durationDays - 1))
      }
      break
    }
    case 'SF': {
      const bound = addDaysIso(predStart, lagDays)
      if (bound > ef) {
        ef = bound
        es = addDaysIso(ef, -(durationDays - 1))
      }
      break
    }
  }

  return { start: es, finish: ef }
}

/** Topological order (predecessors before successors). Falls back to baseline start order. */
function sortTasksForForwardPass(tasks: ProjectTask[], dependencies: TaskDependency[]): ProjectTask[] {
  const taskIds = new Set(tasks.map((t) => t.id))
  const inDegree = new Map<string, number>()
  const successors = new Map<string, string[]>()

  for (const task of tasks) {
    inDegree.set(task.id, 0)
    successors.set(task.id, [])
  }

  for (const dep of dependencies) {
    if (!taskIds.has(dep.predecessor_task_id) || !taskIds.has(dep.successor_task_id)) continue
    successors.get(dep.predecessor_task_id)!.push(dep.successor_task_id)
    inDegree.set(dep.successor_task_id, (inDegree.get(dep.successor_task_id) ?? 0) + 1)
  }

  const baselineOrder = [...tasks].sort((a, b) => {
    const aStart = toIsoDateOnly(a.start_planned) ?? ''
    const bStart = toIsoDateOnly(b.start_planned) ?? ''
    if (aStart !== bStart) return aStart.localeCompare(bStart)
    return (a.msp_uid ?? 0) - (b.msp_uid ?? 0)
  })

  const queue = baselineOrder.filter((t) => (inDegree.get(t.id) ?? 0) === 0)
  const ordered: ProjectTask[] = []
  const seen = new Set<string>()

  while (queue.length > 0) {
    const task = queue.shift()!
    if (seen.has(task.id)) continue
    seen.add(task.id)
    ordered.push(task)

    for (const succId of successors.get(task.id) ?? []) {
      const next = (inDegree.get(succId) ?? 0) - 1
      inDegree.set(succId, next)
      if (next === 0) {
        const succ = tasks.find((t) => t.id === succId)
        if (succ) queue.push(succ)
      }
    }
  }

  for (const task of baselineOrder) {
    if (!seen.has(task.id)) ordered.push(task)
  }

  return ordered
}

/**
 * Rebuild task dates from a new project start using durations + dependency constraints.
 * Returns ISO date strings (YYYY-MM-DD) per task.
 */
function taskTemplateDates(task: ProjectTask): { start: string | null; finish: string | null } {
  return {
    start: task.baseline_start ?? task.start_planned,
    finish: task.baseline_finish ?? task.finish_planned,
  }
}

export function rebuildScheduleFromProjectStart(
  projectStartIso: string,
  tasks: ProjectTask[],
  dependencies: TaskDependency[],
  baselineStartIso: string
): RebuildScheduleResult {
  const ordered = sortTasksForForwardPass(tasks, dependencies)
  const durations = new Map<string, number>()
  const computed = new Map<string, { start: string; finish: string }>()

  const predsBySucc = new Map<string, TaskDependency[]>()
  for (const dep of dependencies) {
    const list = predsBySucc.get(dep.successor_task_id) ?? []
    list.push(dep)
    predsBySucc.set(dep.successor_task_id, list)
  }

  for (const task of tasks) {
    const tpl = taskTemplateDates(task)
    durations.set(task.id, taskDurationDays(tpl.start, tpl.finish))
  }

  /** Root tasks without predecessors: preserve MSP stagger from baseline anchor. */
  const rootOffsets = new Map<string, number>()
  for (const task of tasks) {
    if ((predsBySucc.get(task.id) ?? []).length > 0) continue
    const taskBaselineStart = toIsoDateOnly(taskTemplateDates(task).start)
    if (!taskBaselineStart) continue
    rootOffsets.set(task.id, diffDaysIso(baselineStartIso, taskBaselineStart))
  }

  for (const task of ordered) {
    const duration = durations.get(task.id) ?? 1
    const rootOffset = rootOffsets.get(task.id) ?? 0
    let es = addDaysIso(projectStartIso, rootOffset)
    let ef = finishFromStart(es, duration)

    for (const dep of predsBySucc.get(task.id) ?? []) {
      const predDates = computed.get(dep.predecessor_task_id)
      if (!predDates) continue
      const next = applyDependencyConstraint(
        dep.relation_type,
        dep.lag_duration,
        predDates.start,
        predDates.finish,
        duration,
        es,
        ef
      )
      es = next.start
      ef = next.finish
    }

    computed.set(task.id, { start: es, finish: ef })
  }

  const taskDates = new Map<string, RescheduledTaskDates>()
  for (const [id, dates] of computed) {
    taskDates.set(id, {
      start: toTimestamp(dates.start),
      finish: toTimestamp(dates.finish),
    })
  }

  return {
    taskDates,
    projectStart: projectStartIso,
    baselineStart: baselineStartIso,
  }
}

export { taskDurationDays, toTimestamp }
