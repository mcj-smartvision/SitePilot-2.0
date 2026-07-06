import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AiActionRow,
  AiActionType,
  AiStatus,
  DailyReportInput,
} from '@/lib/supervisor/types'
import type { SiteDailyReport } from '@/types/schedule'
import { generateAiActionText, generateDailyReportSummary } from '@/lib/supervisor/ai-generator'

export async function fetchSupervisorAiDrafts(
  supabase: SupabaseClient,
  projectId: string,
  supervisorId: string
): Promise<AiActionRow[]> {
  const { data, error } = await supabase
    .from('ai_actions')
    .select('*')
    .eq('project_id', projectId)
    .eq('supervisor_id', supervisorId)
    .in('status', ['draft_by_ai', 'confirmed_by_user'])
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    if (error.code === '42P01') return []
    throw new Error(error.message)
  }
  return (data ?? []) as AiActionRow[]
}

export async function createAiActionDraft(
  supabase: SupabaseClient,
  params: {
    type: AiActionType
    projectId: string
    supervisorId: string
    payload: Record<string, unknown>
    relatedTaskId?: string
    locale?: 'fa' | 'en'
  }
): Promise<AiActionRow> {
  const text = await generateAiActionText(params.type, params.payload, params.locale ?? 'fa')

  const { data, error } = await supabase
    .from('ai_actions')
    .insert({
      type: params.type,
      project_id: params.projectId,
      supervisor_id: params.supervisorId,
      related_task_id: params.relatedTaskId ?? null,
      payload: params.payload,
      text_generated: text,
      status: 'draft_by_ai',
      created_by: params.supervisorId,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as AiActionRow
}

export async function updateAiActionText(
  supabase: SupabaseClient,
  actionId: string,
  text: string
): Promise<AiActionRow> {
  const { data, error } = await supabase
    .from('ai_actions')
    .update({ text_generated: text })
    .eq('id', actionId)
    .eq('status', 'draft_by_ai')
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as AiActionRow
}

export async function confirmAiAction(
  supabase: SupabaseClient,
  actionId: string,
  supervisorId: string
): Promise<AiActionRow> {
  const { data: existing, error: fetchError } = await supabase
    .from('ai_actions')
    .select('type')
    .eq('id', actionId)
    .eq('supervisor_id', supervisorId)
    .single()

  if (fetchError) throw new Error(fetchError.message)

  const needsPmReview = ['purchase_request', 'subcontractor_instruction', 'hse_alert'].includes(
    existing.type as string
  )

  const { data, error } = await supabase
    .from('ai_actions')
    .update({
      status: 'confirmed_by_user' satisfies AiStatus,
      confirmed_by: supervisorId,
      confirmed_at: new Date().toISOString(),
      pm_status: needsPmReview ? 'pending' : 'not_required',
    })
    .eq('id', actionId)
    .eq('supervisor_id', supervisorId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as AiActionRow
}

export async function rejectAiAction(
  supabase: SupabaseClient,
  actionId: string,
  supervisorId: string
): Promise<AiActionRow> {
  const { data, error } = await supabase
    .from('ai_actions')
    .update({ status: 'rejected_by_user' satisfies AiStatus })
    .eq('id', actionId)
    .eq('supervisor_id', supervisorId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as AiActionRow
}

export async function submitQuickReport(
  supabase: SupabaseClient,
  input: DailyReportInput,
  locale: 'fa' | 'en' = 'fa'
): Promise<{ report: SiteDailyReport; summaryText: string }> {
  const rawParts = [
    input.supervisorNote ?? '',
    ...input.activities.map(
      (a) =>
        `Task ${a.scheduleActivityId}: ${a.actualStatus} ${a.actualProgressPercent}% quality=${a.qualityStatus}`
    ),
  ].filter(Boolean)

  const summaryText = await generateDailyReportSummary(input, locale)

  const { data: report, error: reportError } = await supabase
    .from('daily_reports')
    .insert({
      project_id: input.siteId,
      report_date: input.date,
      site_supervisor_id: input.supervisorId,
      raw_text: rawParts.join('\n'),
      summary_text: summaryText,
      ai_status: 'draft_by_ai',
      ai_parsed: { summary: summaryText, tasks: [], issues: [], risks: [], materials: [] },
    })
    .select()
    .single()

  if (reportError) throw new Error(reportError.message)

  if (input.activities.length > 0) {
    const rows = input.activities.map((a) => ({
      daily_report_id: report.id,
      schedule_activity_id: a.scheduleActivityId,
      planned_status: a.plannedStatus,
      actual_status: a.actualStatus,
      actual_progress_percent: a.actualProgressPercent,
      quality_status: a.qualityStatus,
      issues: a.issues,
    }))

    const { error: actError } = await supabase.from('daily_report_activities').insert(rows)
    if (actError && actError.code !== '42P01') throw new Error(actError.message)

    for (const a of input.activities) {
      await supabase.from('task_progress_updates').insert({
        project_id: input.siteId,
        task_id: a.scheduleActivityId,
        report_id: report.id,
        progress_date: input.date,
        percent_complete: a.actualProgressPercent,
        note: a.issues.length ? JSON.stringify(a.issues) : null,
        created_by: input.supervisorId,
      })
    }
  }

  return { report: report as SiteDailyReport, summaryText }
}

export async function confirmDailyReportDraft(
  supabase: SupabaseClient,
  reportId: string,
  supervisorId: string,
  editedSummary?: string
): Promise<SiteDailyReport> {
  const patch: Record<string, unknown> = {
    ai_status: 'confirmed_by_user',
  }
  if (editedSummary !== undefined) {
    patch.summary_text = editedSummary
    patch.ai_parsed = { summary: editedSummary }
  }

  const { data, error } = await supabase
    .from('daily_reports')
    .update(patch)
    .eq('id', reportId)
    .eq('site_supervisor_id', supervisorId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as SiteDailyReport
}

export async function rejectDailyReportDraft(
  supabase: SupabaseClient,
  reportId: string,
  supervisorId: string
): Promise<SiteDailyReport> {
  const { data, error } = await supabase
    .from('daily_reports')
    .update({ ai_status: 'rejected_by_user' })
    .eq('id', reportId)
    .eq('site_supervisor_id', supervisorId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as SiteDailyReport
}
