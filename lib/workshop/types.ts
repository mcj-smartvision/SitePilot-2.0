export type WorkshopPackageStatus =
  | 'draft'
  | 'ready'
  | 'in_progress'
  | 'partial'
  | 'done'
  | 'blocked'
  | 'needs_review'

export type WorkshopApprovalStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'change_requested'

export type WorkshopAssignmentStatus = 'planned' | 'partial' | 'done' | 'blocked'
export type WorkshopActualStatus = 'done' | 'partial' | 'blocked'

export interface PackageChangePayload {
  name?: string
  location?: string | null
  quantity?: number
  uom?: string
  crew?: string | null
  note?: string | null
}

export type ReviewReasonCode =
  | 'out_of_baseline_scope'
  | 'missing_quantity_basis'
  | 'missing_uom'
  | 'resource_unclear'
  | 'needs_technical_mapping'
  | 'other'

export const WORKSHOP_UOMS = ['m2', 'm3', 'm', 'ton', 'ea', 'ls', 'kg', 'hr'] as const

export interface ScheduleTreeNode {
  id: string
  kind: 'schedule'
  mspUid: number | null
  taskId: string
  wbs: string | null
  name: string
  depth: number
  packages: WorkshopPackageNode[]
}

export interface WorkshopPackageNode {
  id: string
  kind: 'package'
  name: string
  location: string | null
  quantity: number
  uom: string
  crew: string | null
  note: string | null
  status: WorkshopPackageStatus
  approvalStatus: WorkshopApprovalStatus
  lastPmComment: string | null
  pendingChange: PackageChangePayload | null
  flagForReview: boolean
  reviewReason: string | null
  children: WorkshopPackageNode[]
}

export interface UpdatePackageInput {
  name?: string
  quantity?: number
  uom?: string
  location?: string | null
  crew?: string | null
  note?: string | null
  flagForReview?: boolean
  reviewReason?: string | null
}

export interface CreatePackageInput {
  projectId: string
  parentScheduleNodeId?: string | null
  parentPackageId?: string | null
  name: string
  quantity: number
  uom: string
  location?: string | null
  crew?: string | null
  note?: string | null
  flagForReview?: boolean
  reviewReason?: string | null
}
