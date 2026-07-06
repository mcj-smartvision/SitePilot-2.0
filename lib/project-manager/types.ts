import type { AiStatus } from '@/lib/shared/ai-types'
import type { AiActionType } from '@/lib/supervisor/types'
import type { ProjectScheduleSummary, SiteDailyReport } from '@/types/schedule'

export type ApprovalItemType =
  | 'purchase_request'
  | 'subcontractor_instruction'
  | 'hse_alert'
  | 'qc_action'
  | 'schedule_change'
  | 'resource_escalation'
  | 'daily_report'

export interface ProjectHealthStatus {
  plannedProgress: number
  actualProgress: number
  scheduleDelayDays: number
  criticalDelayedActivities: number
  pendingApprovals: number
  shortageMaterials: number
  shortageManpower: number
  activeQcIssues: number
  activeHseAlerts: number
  riskLevel: 'low' | 'medium' | 'high'
}

export interface ApprovalItem {
  id: string
  kind: 'ai_action' | 'daily_report'
  type: ApprovalItemType
  sourceDepartment: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: AiStatus | 'pending_pm' | 'approved' | 'rejected'
  aiGeneratedText?: string
  createdAt: string
  raw?: Record<string, unknown>
}

export interface DepartmentSummary {
  key: string
  name: string
  pendingCount: number
  issueCount: number
  lastUpdateAt: string
  status: 'ok' | 'warning' | 'critical'
  href?: string
}

export interface ActivityFeedItem {
  id: string
  message: string
  type: 'approval' | 'alert' | 'report' | 'request'
  createdAt: string
}

export interface ProjectManagerDashboardData {
  health: ProjectHealthStatus
  approvals: ApprovalItem[]
  departments: DepartmentSummary[]
  activity: ActivityFeedItem[]
  summary: ProjectScheduleSummary
  reports: SiteDailyReport[]
}

const TYPE_LABELS: Record<AiActionType, string> = {
  purchase_request: 'Purchase Request',
  subcontractor_instruction: 'Subcontractor Instruction',
  pm_comment: 'Supervisor Note',
  hse_alert: 'HSE Alert',
}

export function aiActionToApprovalItem(row: {
  id: string
  type: AiActionType
  text_generated: string
  status: AiStatus
  pm_status?: string
  payload: Record<string, unknown>
  created_at: string
}): ApprovalItem | null {
  if (row.type === 'pm_comment') return null
  if (row.pm_status !== 'pending') return null

  const priority =
    row.type === 'hse_alert' ? 'critical' : row.type === 'purchase_request' ? 'high' : 'medium'

  return {
    id: row.id,
    kind: 'ai_action',
    type: row.type as ApprovalItemType,
    sourceDepartment: 'Site Supervisor',
    title: TYPE_LABELS[row.type] ?? row.type,
    description: String(row.payload.material_name ?? row.payload.instruction ?? row.text_generated.slice(0, 120)),
    priority,
    status: 'pending_pm',
    aiGeneratedText: row.text_generated,
    createdAt: row.created_at,
  }
}

export function dailyReportToApprovalItem(report: SiteDailyReport): ApprovalItem | null {
  const confirmed = report.ai_status === 'confirmed_by_user' || !report.ai_status
  if (!confirmed || report.approved_by_manager) return null

  return {
    id: report.id,
    kind: 'daily_report',
    type: 'daily_report',
    sourceDepartment: 'Site Supervisor',
    title: `Daily Report — ${report.report_date}`,
    description: report.summary_text ?? report.raw_text.slice(0, 120),
    priority: 'medium',
    status: 'pending_pm',
    aiGeneratedText: report.summary_text ?? report.ai_parsed?.summary ?? report.raw_text,
    createdAt: report.created_at,
  }
}
