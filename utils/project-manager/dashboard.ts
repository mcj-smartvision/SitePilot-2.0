import type { SupabaseClient } from '@supabase/supabase-js'
import { buildPmDataGaps } from '@/lib/project-manager/data-gaps'
import { buildPlanCompliance, type PlanComplianceSummary } from '@/lib/project-manager/plan-compliance'
import type { InventoryItemRow } from '@/lib/storekeeper/types'
import type {
  ActivityFeedItem,
  ApprovalItem,
  DepartmentSummary,
  ProjectHealthStatus,
  ProjectManagerDashboardData,
} from '@/lib/project-manager/types'
import { aiActionToApprovalItem, dailyReportToApprovalItem } from '@/lib/project-manager/types'
import { fetchProjectScheduleMeta } from '@/lib/schedule/apply-actual-start'
import type { AiActionRow } from '@/lib/supervisor/types'
import type { ProjectAlert, ProjectScheduleSummary, SiteDailyReport } from '@/types/schedule'
import { fetchAllProjectTasks } from '@/utils/schedule'
import { fetchInventoryItems } from '@/utils/storekeeper/inventory'

export async function fetchPendingAiActionsForPm(
  supabase: SupabaseClient,
  projectId: string
): Promise<AiActionRow[]> {
  const { data, error } = await supabase
    .from('ai_actions')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'confirmed_by_user')
    .eq('pm_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    if (error.code === '42P01') return []
    throw new Error(error.message)
  }
  return (data ?? []) as AiActionRow[]
}

export async function approvePmAiAction(
  supabase: SupabaseClient,
  actionId: string,
  managerId: string,
  editedText?: string,
  options?: { subcontractorId?: string | null }
): Promise<void> {
  const { data: existing, error: fetchError } = await supabase
    .from('ai_actions')
    .select('type')
    .eq('id', actionId)
    .single()

  if (fetchError) throw new Error(fetchError.message)

  if (existing.type === 'subcontractor_instruction' && !options?.subcontractorId) {
    throw new Error(
      'هنوز پیمانکاری معرفی نشده یا انتخاب نشده است. ابتدا پیمانکار را ثبت/انتخاب کنید.'
    )
  }

  const patch: Record<string, unknown> = {
    pm_status: 'approved',
    pm_reviewed_by: managerId,
    pm_reviewed_at: new Date().toISOString(),
  }
  if (editedText !== undefined) patch.text_generated = editedText
  if (existing.type === 'purchase_request') {
    patch.procurement_status = 'pending'
  }
  if (options?.subcontractorId) {
    patch.subcontractor_id = options.subcontractorId
  }

  const { error } = await supabase.from('ai_actions').update(patch).eq('id', actionId)
  if (error) {
    // Column may be missing before migration 42 — still approve without FK
    if (error.code === '42703' && options?.subcontractorId) {
      const { error: retry } = await supabase
        .from('ai_actions')
        .update({
          pm_status: 'approved',
          pm_reviewed_by: managerId,
          pm_reviewed_at: new Date().toISOString(),
          ...(editedText !== undefined ? { text_generated: editedText } : {}),
          ...(existing.type === 'purchase_request' ? { procurement_status: 'pending' } : {}),
        })
        .eq('id', actionId)
      if (retry) throw new Error(retry.message)
      return
    }
    throw new Error(error.message)
  }
}

export async function rejectPmAiAction(
  supabase: SupabaseClient,
  actionId: string,
  managerId: string,
  reason?: string
): Promise<void> {
  const { error } = await supabase
    .from('ai_actions')
    .update({
      pm_status: 'rejected',
      pm_reviewed_by: managerId,
      pm_reviewed_at: new Date().toISOString(),
      pm_rejection_reason: reason ?? null,
    })
    .eq('id', actionId)

  if (error) throw new Error(error.message)
}

async function tableHasRows(
  supabase: SupabaseClient,
  table: string,
  projectId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .limit(1)

  if (error) {
    if (error.code === '42P01' || error.code === '42703') return false
    return false
  }
  return (count ?? 0) > 0
}

export function buildProjectHealth(
  summary: ProjectScheduleSummary,
  inventory: InventoryItemRow[],
  approvals: ApprovalItem[],
  alerts: ProjectAlert[],
  compliance?: PlanComplianceSummary | null
): ProjectHealthStatus {
  const lowStock = inventory.filter((i) => Number(i.current_stock) <= Number(i.min_stock)).length
  const hseAlerts = alerts.filter((a) => a.severity === 'critical' || a.alert_type === 'general').length
  const maxLate = compliance
    ? compliance.rows.reduce((m, r) => Math.max(m, r.daysLate), 0)
    : summary.delayedTasks > 5
      ? 3
      : summary.delayedTasks > 0
        ? 1
        : 0
  const delayDays = maxLate > 0 ? maxLate : summary.delayedTasks > 5 ? 3 : summary.delayedTasks > 0 ? 1 : 0
  const pending = approvals.filter((a) => a.status === 'pending_pm').length

  const plannedProgress = compliance?.totalDue
    ? compliance.avgPlanned
    : Math.min(100, summary.overallPercentComplete)
  const actualProgress = compliance?.totalDue
    ? compliance.avgActual
    : summary.overallPercentComplete

  let riskLevel: ProjectHealthStatus['riskLevel'] = 'low'
  if (
    summary.delayedTasks > 5 ||
    pending > 5 ||
    lowStock > 3 ||
    (compliance?.behind ?? 0) > Math.max(2, Math.floor((compliance?.totalDue ?? 0) * 0.25))
  ) {
    riskLevel = 'high'
  } else if (
    summary.delayedTasks > 0 ||
    pending > 0 ||
    lowStock > 0 ||
    (compliance?.behind ?? 0) > 0
  ) {
    riskLevel = 'medium'
  }

  return {
    plannedProgress,
    actualProgress,
    scheduleDelayDays: delayDays,
    criticalDelayedActivities: summary.criticalTasks,
    pendingApprovals: pending,
    shortageMaterials: lowStock,
    shortageManpower: summary.delayedTasks > 3 ? 1 : 0,
    activeQcIssues: alerts.filter((a) => a.alert_type === 'start_activity').length,
    activeHseAlerts: hseAlerts,
    riskLevel,
  }
}

export function buildDepartmentSummaries(
  approvals: ApprovalItem[],
  alerts: ProjectAlert[]
): DepartmentSummary[] {
  const now = new Date().toISOString()
  const pendingSite = approvals.filter((a) => a.sourceDepartment === 'Site Supervisor').length

  return [
    {
      key: 'site_supervisor',
      name: 'Site',
      pendingCount: pendingSite,
      issueCount: alerts.length,
      lastUpdateAt: now,
      status: pendingSite > 2 ? 'warning' : 'ok',
      href: '/dashboard/site-supervisor',
    },
    {
      key: 'storekeeper',
      name: 'Warehouse',
      pendingCount: 0,
      issueCount: alerts.filter((a) => a.alert_type === 'material_purchase').length,
      lastUpdateAt: now,
      status: 'ok',
      href: '/dashboard/storekeeper',
    },
    {
      key: 'procurement_officer',
      name: 'Procurement',
      pendingCount: approvals.filter((a) => a.type === 'purchase_request').length,
      issueCount: 0,
      lastUpdateAt: now,
      status: 'warning',
      href: '/dashboard/procurement',
    },
    {
      key: 'qa_qc_inspector',
      name: 'QC',
      pendingCount: 0,
      issueCount: 0,
      lastUpdateAt: now,
      status: 'ok',
      href: '/dashboard/qc',
    },
    {
      key: 'hse_officer',
      name: 'HSE',
      pendingCount: approvals.filter((a) => a.type === 'hse_alert').length,
      issueCount: alerts.filter((a) => a.severity === 'critical').length,
      lastUpdateAt: now,
      status: 'warning',
      href: '/dashboard/hse',
    },
  ]
}

export function buildActivityFeed(
  approvals: ApprovalItem[],
  alerts: ProjectAlert[],
  reports: SiteDailyReport[]
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = []

  for (const a of approvals.slice(0, 5)) {
    items.push({
      id: `approval-${a.id}`,
      message: `${a.title} — ${a.status}`,
      type: 'request',
      createdAt: a.createdAt,
    })
  }
  for (const alert of alerts.slice(0, 5)) {
    items.push({
      id: `alert-${alert.id}`,
      message: alert.message.slice(0, 100),
      type: 'alert',
      createdAt: alert.created_at,
    })
  }
  for (const r of reports.filter((x) => x.approved_by_manager).slice(0, 3)) {
    items.push({
      id: `report-${r.id}`,
      message: `Daily report approved — ${r.report_date}`,
      type: 'report',
      createdAt: r.created_at,
    })
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12)
}

export async function loadProjectManagerDashboard(
  supabase: SupabaseClient,
  projectId: string,
  summary: ProjectScheduleSummary,
  reports: SiteDailyReport[],
  alerts: ProjectAlert[]
): Promise<ProjectManagerDashboardData> {
  const [aiRows, inventory, tasks, scheduleMeta, hasProgressCost, hasFinancialCosts] =
    await Promise.all([
      fetchPendingAiActionsForPm(supabase, projectId),
      fetchInventoryItems(supabase, projectId).catch(() => [] as InventoryItemRow[]),
      fetchAllProjectTasks(supabase, projectId).catch(() => []),
      fetchProjectScheduleMeta(supabase, projectId).catch(() => ({
        schedule_baseline_start: null,
        schedule_actual_start: null,
        schedule_start_aligned: null,
      })),
      tableHasRows(supabase, 'project_progress_cost', projectId),
      tableHasRows(supabase, 'financial_costs', projectId),
    ])

  const compliance = buildPlanCompliance(tasks, {
    actualStart: scheduleMeta.schedule_actual_start,
  })

  const aiApprovals = aiRows.map(aiActionToApprovalItem).filter(Boolean) as ApprovalItem[]
  const reportApprovals = reports.map(dailyReportToApprovalItem).filter(Boolean) as ApprovalItem[]
  const approvals = [...aiApprovals, ...reportApprovals].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )

  const health = buildProjectHealth(summary, inventory, approvals, alerts, compliance)
  const departments = buildDepartmentSummaries(approvals, alerts)
  const activity = buildActivityFeed(approvals, alerts, reports)

  const dataGaps = buildPmDataGaps({
    projectId,
    taskCount: tasks.length || summary.totalTasks,
    actualStart: scheduleMeta.schedule_actual_start,
    baselineStart: scheduleMeta.schedule_baseline_start,
    inventoryCount: inventory.length,
    lowStockCount: inventory.filter((i) => Number(i.current_stock) <= Number(i.min_stock)).length,
    reportCount: reports.length,
    alertCount: alerts.length,
    hasProgressCostRows: hasProgressCost,
    hasFinancialCosts,
    planComplianceAvailable: compliance.shouldShowChecklist,
  })

  return {
    health,
    approvals,
    departments,
    activity,
    summary,
    reports,
    compliance,
    dataGaps,
    scheduleMeta,
  }
}
