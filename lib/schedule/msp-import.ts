import type { SupabaseClient } from '@supabase/supabase-js'
import type { MspImportResult } from '@/types/schedule'

export interface MspParsedTask {
  msp_uid: number
  wbs_code: string | null
  name: string
  start_planned: string | null
  finish_planned: string | null
  percent_complete: number
  is_critical: boolean
}

export interface MspParsedDependency {
  predecessor_uid: number
  successor_uid: number
  relation_type: 'FS' | 'SS' | 'FF' | 'SF'
  lag_duration: number
}

/**
 * Stub MSP XML parser — replace with fast-xml-parser or Python FastAPI service.
 * For now returns empty arrays; structure is ready for real implementation.
 */
export function parseMspXml(_xmlContent: string): {
  tasks: MspParsedTask[]
  dependencies: MspParsedDependency[]
} {
  return { tasks: [], dependencies: [] }
}

/** Persist parsed MSP data into Supabase (idempotent by project_id + msp_uid). */
export async function importMspScheduleToProject(
  supabase: SupabaseClient,
  projectId: string,
  fileName: string,
  xmlContent: string,
  importedBy: string
): Promise<MspImportResult> {
  const parsed = parseMspXml(xmlContent)

  const { data: importRow, error: importError } = await supabase
    .from('schedule_imports')
    .insert({
      project_id: projectId,
      file_name: fileName,
      status: 'processing',
      imported_by: importedBy,
    })
    .select()
    .single()

  if (importError) throw new Error(importError.message)

  const uidToTaskId = new Map<number, string>()
  let tasksImported = 0

  for (const task of parsed.tasks) {
    const { data, error } = await supabase
      .from('project_tasks')
      .upsert(
        {
          project_id: projectId,
          msp_uid: task.msp_uid,
          wbs_code: task.wbs_code,
          name: task.name,
          start_planned: task.start_planned,
          finish_planned: task.finish_planned,
          percent_complete: task.percent_complete,
          is_critical: task.is_critical,
        },
        { onConflict: 'project_id,msp_uid' }
      )
      .select('id, msp_uid')
      .single()

    if (error) throw new Error(error.message)
    if (data?.msp_uid != null) uidToTaskId.set(data.msp_uid, data.id)
    tasksImported++
  }

  let dependenciesImported = 0
  for (const dep of parsed.dependencies) {
    const predecessorId = uidToTaskId.get(dep.predecessor_uid)
    const successorId = uidToTaskId.get(dep.successor_uid)
    if (!predecessorId || !successorId) continue

    const { error } = await supabase.from('task_dependencies').upsert(
      {
        project_id: projectId,
        predecessor_task_id: predecessorId,
        successor_task_id: successorId,
        relation_type: dep.relation_type,
        lag_duration: dep.lag_duration,
      },
      { onConflict: 'project_id,predecessor_task_id,successor_task_id,relation_type' }
    )

    if (error) throw new Error(error.message)
    dependenciesImported++
  }

  await supabase
    .from('schedule_imports')
    .update({
      status: 'completed',
      tasks_imported: tasksImported,
      dependencies_imported: dependenciesImported,
      completed_at: new Date().toISOString(),
    })
    .eq('id', importRow.id)

  return {
    import_id: importRow.id,
    tasks_imported: tasksImported,
    dependencies_imported: dependenciesImported,
  }
}
