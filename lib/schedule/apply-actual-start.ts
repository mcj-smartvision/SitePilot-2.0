import type { SupabaseClient } from '@supabase/supabase-js'
import {
  addDaysIso,
  computeBaselineStartFromTasks,
  diffDaysIso,
  shiftIsoTimestamp,
  toIsoDateOnly,
} from '@/lib/schedule/dates'
import type { ProjectTask } from '@/types/schedule'

export interface ApplyActualStartInput {
  projectId: string
  actualStartDate: string
  alignedWithBaseline: boolean
}

export interface ScheduleStartAnalysis {
  baseline_start: string
  actual_start: string
  shift_days: number
  tasks_updated: number
  tasks_in_progress: number
  tasks_completed: number
  tasks_delayed: number
  overall_percent: number
}

export async function fetchProjectScheduleMeta(
  supabase: SupabaseClient,
  projectId: string
): Promise<{
  schedule_baseline_start: string | null
  schedule_actual_start: string | null
  schedule_start_aligned: boolean | null
}> {
  const { data, error } = await supabase
    .from('projects')
    .select('schedule_baseline_start, schedule_actual_start, schedule_start_aligned')
    .eq('id', projectId)
    .maybeSingle()

  if (error) {
    if (error.code === '42703') {
      return { schedule_baseline_start: null, schedule_actual_start: null, schedule_start_aligned: null }
    }
    throw new Error(error.message)
  }

  return {
    schedule_baseline_start: data?.schedule_baseline_start ?? null,
    schedule_actual_start: data?.schedule_actual_start ?? null,
    schedule_start_aligned: data?.schedule_start_aligned ?? null,
  }
}

export async function applyActualStartToSchedule(
  supabase: SupabaseClient,
  input: ApplyActualStartInput
): Promise<ScheduleStartAnalysis> {
  const { projectId, actualStartDate, alignedWithBaseline } = input

  const { data: tasks, error: tasksError } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)

  if (tasksError) throw new Error(tasksError.message)
  const rows = (tasks ?? []) as ProjectTask[]

  if (rows.length === 0) {
    throw new Error('No tasks found — import MSP XML first')
  }

  const baselineStart =
    computeBaselineStartFromTasks(rows) ??
    toIsoDateOnly(rows[0].start_planned) ??
    actualStartDate

  const actualStart = alignedWithBaseline ? baselineStart : actualStartDate
  const shiftDays = diffDaysIso(baselineStart, actualStart)

  const today = new Date().toISOString().slice(0, 10)
  let tasksInProgress = 0
  let tasksCompleted = 0
  let tasksDelayed = 0
  let percentSum = 0

  for (const task of rows) {
    const pct = Number(task.percent_complete)
    percentSum += pct

    const startCurrent = shiftIsoTimestamp(task.start_planned, shiftDays)
    const finishCurrent = shiftIsoTimestamp(task.finish_planned, shiftDays)

    const { error: updateError } = await supabase
      .from('project_tasks')
      .update({
        start_current: startCurrent,
        finish_current: finishCurrent,
      })
      .eq('id', task.id)

    if (updateError) throw new Error(updateError.message)

    if (pct >= 100) tasksCompleted++
    else if (pct > 0) tasksInProgress++

    const finishIso = toIsoDateOnly(finishCurrent)
    if (pct < 100 && finishIso && finishIso < today) tasksDelayed++
  }

  const projectUpdate: Record<string, unknown> = {
    schedule_baseline_start: baselineStart,
    schedule_actual_start: actualStart,
    schedule_start_aligned: alignedWithBaseline,
    start_date: actualStart,
  }

  const { error: projectError } = await supabase
    .from('projects')
    .update(projectUpdate)
    .eq('id', projectId)

  if (projectError && projectError.code !== '42703') {
    throw new Error(projectError.message)
  }

  return {
    baseline_start: baselineStart,
    actual_start: actualStart,
    shift_days: shiftDays,
    tasks_updated: rows.length,
    tasks_in_progress: tasksInProgress,
    tasks_completed: tasksCompleted,
    tasks_delayed: tasksDelayed,
    overall_percent: rows.length ? Math.round(percentSum / rows.length) : 0,
  }
}

/** After MSP import: store baseline, keep current = planned until user confirms actual start. */
export async function setScheduleBaselineAfterImport(
  supabase: SupabaseClient,
  projectId: string,
  baselineStart: string
): Promise<void> {
  const payload: Record<string, unknown> = {
    schedule_baseline_start: baselineStart,
    schedule_actual_start: null,
    schedule_start_aligned: null,
  }

  const { error } = await supabase.from('projects').update(payload).eq('id', projectId)
  if (error && error.code !== '42703') throw new Error(error.message)
}

export function previewShiftDays(baselineStart: string, actualStart: string): number {
  return diffDaysIso(baselineStart, actualStart)
}

export function previewActualFinish(plannedFinish: string | null, shiftDays: number): string | null {
  const iso = toIsoDateOnly(plannedFinish)
  if (!iso) return null
  return addDaysIso(iso, shiftDays)
}
