import type { SupabaseClient } from '@supabase/supabase-js'
import { parseCrePhase1Export, type CrePhase1Export } from '@/lib/cre-contract'
import {
  approveActual,
  assertPermission,
  buildDailyReport,
  generateDailyPlanDraft,
  issueDailyPlan,
  promoteCreRun,
  submitActual,
  type SiteOpsRole,
} from '@/lib/site-ops-domain'
import { SiteOpsError } from '@/lib/site-ops-domain/errors'
import { writeSiteOpsAudit } from './audit'
import {
  assertProjectAccess,
  loadMemberPositionKeys,
  requireUser,
  resolveSiteOpsRoles,
} from './auth'

function fieldValue(field: unknown): unknown {
  if (field && typeof field === 'object' && 'value' in (field as object)) {
    return (field as { value: unknown }).value
  }
  return field
}

async function rolesFor(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<SiteOpsRole[]> {
  const keys = await loadMemberPositionKeys(supabase, userId, projectId)
  return resolveSiteOpsRoles(supabase, userId, projectId, keys)
}

export async function importCreRun(
  supabase: SupabaseClient,
  params: { projectId: string; json: unknown }
) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, params.projectId)
  const roles = await rolesFor(supabase, user.id, params.projectId)
  assertPermission(roles, 'cre.import')

  const parsed = parseCrePhase1Export(params.json)
  const { data, error } = await supabase
    .from('site_ops_cre_runs')
    .insert({
      project_id: params.projectId,
      policy_version: parsed.policy_version,
      gate: parsed.summary.gate,
      overall_score: parsed.summary.overall_score,
      blocker_count: parsed.summary.blocker_count,
      forecast: parsed.summary.forecast,
      raw_json: parsed,
      summary_json: parsed.summary,
      imported_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw new SiteOpsError('VALIDATION', error.message)

  await writeSiteOpsAudit(supabase, {
    projectId: params.projectId,
    actorId: user.id,
    action: 'cre.import',
    entityType: 'cre_run',
    entityId: data.id,
    payload: { gate: data.gate, score: data.overall_score },
  })

  return data
}

export async function getCreRun(supabase: SupabaseClient, id: string) {
  const user = await requireUser(supabase)
  const { data, error } = await supabase.from('site_ops_cre_runs').select('*').eq('id', id).maybeSingle()
  if (error) throw new SiteOpsError('VALIDATION', error.message)
  if (!data) throw new SiteOpsError('NOT_FOUND', 'CRE run not found')
  await assertProjectAccess(supabase, user.id, data.project_id)
  return data
}

export async function listCreRuns(supabase: SupabaseClient, projectId: string) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  const { data, error } = await supabase
    .from('site_ops_cre_runs')
    .select('id, project_id, policy_version, gate, overall_score, blocker_count, forecast, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw new SiteOpsError('VALIDATION', error.message)
  return data ?? []
}

export async function promoteRun(
  supabase: SupabaseClient,
  creRunId: string,
  options: { force?: boolean; forceReason?: string; taskUids?: number[] }
) {
  const run = await getCreRun(supabase, creRunId)
  const user = await requireUser(supabase)
  const roles = await rolesFor(supabase, user.id, run.project_id)
  const exportJson = run.raw_json as CrePhase1Export

  const result = promoteCreRun(exportJson, {
    roles,
    force: options.force,
    forceReason: options.forceReason,
    taskUids: options.taskUids,
  })

  const rows = result.snapshots.map((s) => ({
    project_id: run.project_id,
    cre_run_id: creRunId,
    task_uid: s.taskUid,
    wbs: s.wbs,
    name: s.name,
    location_json: s.location,
    quantity_json: s.quantity,
    uom_json: s.uom,
    crew_resource_json: s.crewResource,
    person_day_json: s.personDay,
    progress_method_json: s.progressMethod,
    start_json: s.start,
    finish_json: s.finish,
    readiness_row_status: s.readinessRowStatus,
    force_promoted: s.forcePromoted,
    force_reason: s.forceReason,
    is_active: true,
  }))

  const { data, error } = await supabase
    .from('site_ops_operational_tasks')
    .upsert(rows, { onConflict: 'cre_run_id,task_uid' })
    .select('*')

  if (error) throw new SiteOpsError('VALIDATION', error.message)

  await writeSiteOpsAudit(supabase, {
    projectId: run.project_id,
    actorId: user.id,
    action: result.forceUsed ? 'cre.force_promote' : 'cre.promote',
    entityType: 'cre_run',
    entityId: creRunId,
    payload: {
      count: data?.length ?? 0,
      skipped: result.skipped,
      forceReason: options.forceReason ?? null,
    },
  })

  return { snapshots: data ?? [], skipped: result.skipped, forceUsed: result.forceUsed }
}

export async function listOperationalTasks(supabase: SupabaseClient, projectId: string) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  const { data, error } = await supabase
    .from('site_ops_operational_tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('task_uid', { ascending: true })
  if (error) throw new SiteOpsError('VALIDATION', error.message)
  return data ?? []
}

export async function createDailyPlan(
  supabase: SupabaseClient,
  params: {
    projectId: string
    planDate: string
    notes?: string
    allowNotReadyOverride?: boolean
    overrideReason?: string
    workOrders: Array<{
      operationalTaskId: string
      plannedQuantity: number
      plannedPersonDays: number
      assignedCrewId?: string | null
      location?: string | null
      shift?: string | null
      constraints?: string[]
    }>
  }
) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, params.projectId)
  const roles = await rolesFor(supabase, user.id, params.projectId)

  const { count } = await supabase
    .from('site_ops_operational_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', params.projectId)
    .eq('is_active', true)

  const { data: latestRun } = await supabase
    .from('site_ops_cre_runs')
    .select('id, gate')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const draft = generateDailyPlanDraft({
    roles,
    planDate: params.planDate,
    notes: params.notes,
    latestGate: (latestRun?.gate as 'CONTROL_READY' | 'NOT_CONTROL_READY') ?? null,
    allowNotReadyOverride: params.allowNotReadyOverride,
    overrideReason: params.overrideReason,
    promotedTaskCount: count ?? 0,
    workOrders: params.workOrders.map((wo) => ({
      ...wo,
      assignedCrewId: wo.assignedCrewId ?? null,
    })),
  })

  const { data: plan, error } = await supabase
    .from('site_ops_daily_plans')
    .insert({
      project_id: params.projectId,
      plan_date: draft.planDate,
      status: 'DRAFT',
      notes: draft.notes,
      cre_run_id: latestRun?.id ?? null,
      gate_at_issue: latestRun?.gate ?? null,
      override_used: draft.overrideUsed,
      override_reason: draft.overrideReason,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw new SiteOpsError('VALIDATION', error.message)

  const woRows = draft.workOrders.map((wo) => ({
    daily_plan_id: plan.id,
    operational_task_id: wo.operationalTaskId,
    planned_quantity: wo.plannedQuantity,
    planned_person_days: wo.plannedPersonDays,
    assigned_crew_id: wo.assignedCrewId,
    location: wo.location,
    shift: wo.shift,
    status: 'PLANNED',
    constraints: wo.constraints,
  }))

  const { data: workOrders, error: woError } = await supabase
    .from('site_ops_work_orders')
    .insert(woRows)
    .select('*')

  if (woError) throw new SiteOpsError('VALIDATION', woError.message)

  await writeSiteOpsAudit(supabase, {
    projectId: params.projectId,
    actorId: user.id,
    action: 'plan.draft',
    entityType: 'daily_plan',
    entityId: plan.id,
    payload: { overrideUsed: draft.overrideUsed, workOrderCount: workOrders?.length ?? 0 },
  })

  return { plan, workOrders: workOrders ?? [] }
}

export async function issuePlan(supabase: SupabaseClient, planId: string) {
  const user = await requireUser(supabase)
  const { data: plan, error } = await supabase
    .from('site_ops_daily_plans')
    .select('*, site_ops_work_orders(id)')
    .eq('id', planId)
    .maybeSingle()
  if (error) throw new SiteOpsError('VALIDATION', error.message)
  if (!plan) throw new SiteOpsError('NOT_FOUND', 'Daily plan not found')

  await assertProjectAccess(supabase, user.id, plan.project_id)
  const roles = await rolesFor(supabase, user.id, plan.project_id)
  const woCount = Array.isArray(plan.site_ops_work_orders) ? plan.site_ops_work_orders.length : 0
  issueDailyPlan({ roles, status: plan.status, workOrderCount: woCount })

  const { data: updated, error: upErr } = await supabase
    .from('site_ops_daily_plans')
    .update({ status: 'ISSUED', issued_by: user.id, updated_at: new Date().toISOString() })
    .eq('id', planId)
    .select('*')
    .single()
  if (upErr) throw new SiteOpsError('VALIDATION', upErr.message)

  await writeSiteOpsAudit(supabase, {
    projectId: plan.project_id,
    actorId: user.id,
    action: 'plan.issue',
    entityType: 'daily_plan',
    entityId: planId,
  })

  return updated
}

export async function getPlanByDate(supabase: SupabaseClient, projectId: string, planDate: string) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  const { data: plan, error } = await supabase
    .from('site_ops_daily_plans')
    .select('*')
    .eq('project_id', projectId)
    .eq('plan_date', planDate)
    .maybeSingle()
  if (error) throw new SiteOpsError('VALIDATION', error.message)
  if (!plan) return null

  const { data: workOrders } = await supabase
    .from('site_ops_work_orders')
    .select('*, site_ops_operational_tasks(*), site_ops_actual_entries(*)')
    .eq('daily_plan_id', plan.id)

  return { plan, workOrders: workOrders ?? [] }
}

export async function listDailyPlans(supabase: SupabaseClient, projectId: string) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  const { data, error } = await supabase
    .from('site_ops_daily_plans')
    .select('*')
    .eq('project_id', projectId)
    .order('plan_date', { ascending: false })
  if (error) throw new SiteOpsError('VALIDATION', error.message)
  return data ?? []
}

export async function getWorkOrder(supabase: SupabaseClient, workOrderId: string) {
  const user = await requireUser(supabase)
  const { data: wo, error } = await supabase
    .from('site_ops_work_orders')
    .select('*, site_ops_operational_tasks(*), site_ops_daily_plans(*), site_ops_actual_entries(*)')
    .eq('id', workOrderId)
    .maybeSingle()
  if (error) throw new SiteOpsError('VALIDATION', error.message)
  if (!wo) throw new SiteOpsError('NOT_FOUND', 'Work order not found')
  const plan = wo.site_ops_daily_plans as { project_id: string }
  await assertProjectAccess(supabase, user.id, plan.project_id)
  return wo
}

export async function submitWorkOrderActual(
  supabase: SupabaseClient,
  workOrderId: string,
  body: {
    actualQuantity: number
    actualPersonDays: number
    actualUom?: string | null
    progressMethod?: string | null
    evidenceNotes?: string | null
    actualStart?: string | null
    actualFinish?: string | null
  }
) {
  const wo = await getWorkOrder(supabase, workOrderId)
  const user = await requireUser(supabase)
  const plan = wo.site_ops_daily_plans as { project_id: string; status: string }
  const task = wo.site_ops_operational_tasks as { uom_json: unknown; crew_resource_json: unknown }
  const roles = await rolesFor(supabase, user.id, plan.project_id)

  const named =
    Boolean(wo.assigned_crew_id) ||
    Boolean(fieldValue(task.crew_resource_json) != null && String(fieldValue(task.crew_resource_json)).length > 0)

  const decision = submitActual({
    roles,
    planStatus: plan.status as 'DRAFT' | 'ISSUED' | 'LOCKED' | 'CLOSED',
    workOrderStatus: wo.status,
    snapshotUom: task.uom_json,
    actualQuantity: body.actualQuantity,
    actualUom: body.actualUom,
    actualPersonDays: body.actualPersonDays,
    namedCrewOrWorkers: named,
    progressMethod: body.progressMethod,
    evidenceNotes: body.evidenceNotes,
    actualStart: body.actualStart,
    actualFinish: body.actualFinish,
  })

  const { data, error } = await supabase
    .from('site_ops_actual_entries')
    .insert({
      work_order_id: workOrderId,
      reported_by: user.id,
      actual_quantity: decision.actualQuantity,
      actual_person_days: decision.actualPersonDays,
      actual_uom: body.actualUom ?? null,
      progress_method: body.progressMethod ?? null,
      evidence_notes: body.evidenceNotes ?? null,
      actual_start: body.actualStart ?? null,
      actual_finish: body.actualFinish ?? null,
      status: 'SUBMITTED',
    })
    .select('*')
    .single()
  if (error) throw new SiteOpsError('VALIDATION', error.message)

  await supabase
    .from('site_ops_work_orders')
    .update({ status: 'IN_PROGRESS' })
    .eq('id', workOrderId)
    .eq('status', 'PLANNED')

  await writeSiteOpsAudit(supabase, {
    projectId: plan.project_id,
    actorId: user.id,
    action: 'actual.submit',
    entityType: 'actual_entry',
    entityId: data.id,
    payload: { workOrderId },
  })

  return data
}

export async function decideActual(
  supabase: SupabaseClient,
  actualId: string,
  approve: boolean
) {
  const user = await requireUser(supabase)
  const { data: actual, error } = await supabase
    .from('site_ops_actual_entries')
    .select('*, site_ops_work_orders(id, daily_plan_id, site_ops_daily_plans(project_id))')
    .eq('id', actualId)
    .maybeSingle()
  if (error) throw new SiteOpsError('VALIDATION', error.message)
  if (!actual) throw new SiteOpsError('NOT_FOUND', 'Actual not found')

  const wo = actual.site_ops_work_orders as {
    site_ops_daily_plans: { project_id: string }
  }
  const projectId = wo.site_ops_daily_plans.project_id
  await assertProjectAccess(supabase, user.id, projectId)
  const roles = await rolesFor(supabase, user.id, projectId)
  const decision = approveActual({ roles, status: actual.status, approve })

  const { data, error: upErr } = await supabase
    .from('site_ops_actual_entries')
    .update({
      status: decision.status,
      approved_by: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq('id', actualId)
    .select('*')
    .single()
  if (upErr) throw new SiteOpsError('VALIDATION', upErr.message)

  if (decision.status === 'APPROVED') {
    await supabase
      .from('site_ops_work_orders')
      .update({ status: 'DONE' })
      .eq('id', actual.work_order_id)
  }

  await writeSiteOpsAudit(supabase, {
    projectId,
    actorId: user.id,
    action: approve ? 'actual.approve' : 'actual.reject',
    entityType: 'actual_entry',
    entityId: actualId,
  })

  return data
}

export async function buildReportForDate(
  supabase: SupabaseClient,
  projectId: string,
  planDate: string
) {
  const bundle = await getPlanByDate(supabase, projectId, planDate)
  if (!bundle) throw new SiteOpsError('NOT_FOUND', 'No daily plan for this date')

  const lines = bundle.workOrders.map((wo: Record<string, unknown>) => {
    const task = wo.site_ops_operational_tasks as {
      task_uid: number
      name: string
    }
    const actuals = (wo.site_ops_actual_entries as Array<{
      actual_quantity: number
      actual_person_days: number
      status: string
      created_at: string
    }>) ?? []
    const approved = actuals.find((a) => a.status === 'APPROVED') ?? null
    const latest = [...actuals].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null

    return {
      workOrderId: String(wo.id),
      taskUid: task.task_uid,
      taskName: task.name,
      location: (wo.location as string | null) ?? null,
      crewId: (wo.assigned_crew_id as string | null) ?? null,
      plannedQuantity: Number(wo.planned_quantity),
      plannedPersonDays: Number(wo.planned_person_days),
      constraints: (wo.constraints as string[]) ?? [],
      approvedActual: approved
        ? {
            actualQuantity: Number(approved.actual_quantity),
            actualPersonDays: Number(approved.actual_person_days),
            status: approved.status,
          }
        : null,
      latestActual: latest
        ? {
            actualQuantity: Number(latest.actual_quantity),
            actualPersonDays: Number(latest.actual_person_days),
            status: latest.status,
          }
        : null,
    }
  })

  const report = buildDailyReport({
    planDate,
    projectId,
    planStatus: bundle.plan.status,
    gate: bundle.plan.gate_at_issue,
    lines,
  })

  return report
}

export async function ensureDefaultCrew(
  supabase: SupabaseClient,
  projectId: string,
  name: string
) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  const { data: existing } = await supabase
    .from('site_ops_crews')
    .select('*')
    .eq('project_id', projectId)
    .eq('name', name)
    .maybeSingle()
  if (existing) return existing

  const { data, error } = await supabase
    .from('site_ops_crews')
    .insert({ project_id: projectId, name, cre_resource_name: name })
    .select('*')
    .single()
  if (error) throw new SiteOpsError('VALIDATION', error.message)
  return data
}

export async function listCrews(supabase: SupabaseClient, projectId: string) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  const { data, error } = await supabase
    .from('site_ops_crews')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true)
  if (error) throw new SiteOpsError('VALIDATION', error.message)
  return data ?? []
}
