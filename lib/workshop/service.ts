import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { fetchAllProjectTasks } from '@/utils/schedule'
import { isSystemAdmin } from '@/lib/admin/access'
import {
  assertProjectAccess,
  loadMemberPositionKeys,
  requireUser,
} from '@/lib/site-ops/auth'
import { writeSiteOpsAudit } from '@/lib/site-ops/audit'
import { SiteOpsError } from '@/lib/site-ops-domain/errors'
import {
  mapSitePilotPositionToSiteOpsRoles,
  type SiteOpsRole,
} from '@/lib/site-ops-domain'
import {
  assertCanDeletePackage,
  assertCanEditPackage,
  assertCanRequestChange,
  assertCanSendToToday,
  assertCanSubmitForApproval,
  canReviseChangeRequest,
  type ApprovalStatus,
} from './approvals'
import {
  inferReviewReason,
  validateCreatePackage,
  wbsDepth,
  WorkshopError,
} from './domain'
import type {
  CreatePackageInput,
  PackageChangePayload,
  ScheduleTreeNode,
  UpdatePackageInput,
  WorkshopPackageNode,
} from './types'

function mapPackage(row: Record<string, unknown>, children: WorkshopPackageNode[] = []): WorkshopPackageNode {
  return {
    id: String(row.id),
    kind: 'package',
    name: String(row.name),
    location: (row.location as string) ?? null,
    quantity: Number(row.quantity),
    uom: String(row.uom),
    crew: (row.crew as string) ?? null,
    note: (row.note as string) ?? null,
    status: row.status as WorkshopPackageNode['status'],
    approvalStatus: ((row.approval_status as ApprovalStatus) ?? 'draft') as WorkshopPackageNode['approvalStatus'],
    lastPmComment: (row.last_pm_comment as string) ?? null,
    pendingChange: (row.pending_change as PackageChangePayload) ?? null,
    flagForReview: Boolean(row.flag_for_review),
    reviewReason: (row.review_reason as string) ?? null,
    children,
  }
}

function assertHasRole(roles: SiteOpsRole[], allowed: SiteOpsRole[]) {
  if (!roles.some((r) => allowed.includes(r))) {
    throw new WorkshopError('FORBIDDEN', 'دسترسی برای این عملیات ندارید')
  }
}

const WORKSHOP_WRITE_ROLES: SiteOpsRole[] = [
  'TECHNICAL_OFFICE',
  'SITE_MANAGER',
  'PM',
  'PLANNER',
  'PROJECT_CONTROLS',
]

const WORKSHOP_WRITE_POSITIONS = new Set([
  'technical_office',
  'project_manager',
  'planning_engineer',
  'civil_engineer',
  'site_manager',
])

export function canWriteWorkshop(roles: SiteOpsRole[]): boolean {
  return roles.some((r) => WORKSHOP_WRITE_ROLES.includes(r))
}

/**
 * Workshop roles from project positions + grants.
 * System admin does NOT get write by default if their only project position is supervisor —
 * otherwise testing the supervisor dashboard always looks "editable".
 */
async function resolveWorkshopRoles(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<SiteOpsRole[]> {
  const keys = await loadMemberPositionKeys(supabase, userId, projectId)
  const roles = new Set<SiteOpsRole>(mapSitePilotPositionToSiteOpsRoles(keys))

  const { data: grants } = await supabase
    .from('site_ops_role_grants')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)

  for (const g of grants ?? []) {
    if (g.role) roles.add(g.role as SiteOpsRole)
  }

  const admin = await isSystemAdmin(supabase, userId)
  const hasWritePosition = keys.some((k) => WORKSHOP_WRITE_POSITIONS.has(k))

  // Workshop write follows project positions — never blanket system-admin write.
  // Otherwise admin testing the supervisor dashboard always sees edit controls.
  if (admin && hasWritePosition) {
    roles.add('TECHNICAL_OFFICE')
    roles.add('PM')
    roles.add('SITE_MANAGER')
    roles.add('PROJECT_CONTROLS')
  } else if (admin && keys.length === 0) {
    // Admin with no position on this project: view-only in workshop.
    roles.add('SUPERVISOR')
  }

  if (roles.size === 0) roles.add('VIEWER')
  return [...roles]
}

async function resolveRoles(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<SiteOpsRole[]> {
  // Prefer position-aware workshop roles (do not use blanket admin write).
  return resolveWorkshopRoles(supabase, userId, projectId)
}

export async function getWorkshopCapabilities(
  supabase: SupabaseClient,
  projectId: string
) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  const roles = await resolveWorkshopRoles(supabase, user.id, projectId)
  const canWrite = canWriteWorkshop(roles)
  const canApprove = roles.some((r) => r === 'PM' || r === 'SITE_MANAGER')
  const canComment = roles.some((r) =>
    ['PM', 'SITE_MANAGER', 'TECHNICAL_OFFICE', 'SUPERVISOR'].includes(r)
  )
  return {
    roles,
    canWrite,
    canApprove,
    canComment,
    readOnly: !canWrite,
  }
}

async function loadPackage(supabase: SupabaseClient, packageId: string) {
  const { data, error } = await supabase
    .from('workshop_packages')
    .select('*')
    .eq('id', packageId)
    .maybeSingle()
  if (error) throw new WorkshopError('VALIDATION', error.message)
  if (!data) throw new WorkshopError('NOT_FOUND', 'پکیج پیدا نشد')
  return data
}

async function writeApprovalEvent(
  supabase: SupabaseClient,
  opts: {
    projectId: string
    packageId: string
    eventType: string
    comment?: string | null
    proposedChange?: PackageChangePayload | null
    actorId: string
  }
) {
  await supabase.from('workshop_approval_events').insert({
    project_id: opts.projectId,
    package_id: opts.packageId,
    event_type: opts.eventType,
    comment: opts.comment?.trim() || null,
    proposed_change: opts.proposedChange ?? null,
    actor_id: opts.actorId,
  })
}

function normalizeChangePayload(input: UpdatePackageInput | PackageChangePayload): PackageChangePayload {
  const out: PackageChangePayload = {}
  if (input.name !== undefined) {
    const name = input.name?.trim()
    if (!name) throw new WorkshopError('VALIDATION', 'نام را وارد کنید')
    out.name = name
  }
  if (input.quantity !== undefined) {
    if (!(Number(input.quantity) > 0)) throw new WorkshopError('VALIDATION', 'مقدار باید بزرگ‌تر از صفر باشد')
    out.quantity = Number(input.quantity)
  }
  if (input.uom !== undefined) {
    const uom = input.uom?.trim()
    if (!uom) throw new WorkshopError('VALIDATION', 'واحد را انتخاب کنید')
    out.uom = uom
  }
  if (input.location !== undefined) out.location = input.location?.trim() || null
  if (input.crew !== undefined) out.crew = input.crew?.trim() || null
  if (input.note !== undefined) out.note = input.note?.trim() || null
  return out
}

function nestPackages(rows: Record<string, unknown>[]): {
  byTask: Map<string, WorkshopPackageNode[]>
  rootsUnderPackages: WorkshopPackageNode[]
} {
  const byId = new Map<string, WorkshopPackageNode>()
  for (const row of rows) {
    byId.set(String(row.id), mapPackage(row, []))
  }
  const byTask = new Map<string, WorkshopPackageNode[]>()
  const rootsUnderPackages: WorkshopPackageNode[] = []

  for (const row of rows) {
    const node = byId.get(String(row.id))!
    const parentPkg = row.parent_package_id ? String(row.parent_package_id) : null
    if (parentPkg && byId.has(parentPkg)) {
      byId.get(parentPkg)!.children.push(node)
      continue
    }
    const taskId = row.project_task_id ? String(row.project_task_id) : null
    if (taskId) {
      const list = byTask.get(taskId) ?? []
      list.push(node)
      byTask.set(taskId, list)
    } else {
      rootsUnderPackages.push(node)
    }
  }
  return { byTask, rootsUnderPackages }
}

export async function getScheduleTree(supabase: SupabaseClient, projectId: string) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  const capabilities = await getWorkshopCapabilities(supabase, projectId)

  const tasks = await fetchAllProjectTasks(supabase, projectId)
  const { data: packages, error } = await supabase
    .from('workshop_packages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw new WorkshopError('VALIDATION', error.message)

  const { byTask } = nestPackages((packages ?? []) as Record<string, unknown>[])

  const nodes: ScheduleTreeNode[] = tasks
    .slice()
    .sort((a, b) => String(a.wbs_code ?? '').localeCompare(String(b.wbs_code ?? ''), undefined, { numeric: true }))
    .map((t) => ({
      id: t.id,
      kind: 'schedule' as const,
      mspUid: t.msp_uid,
      taskId: t.id,
      wbs: t.wbs_code,
      name: t.name,
      depth: wbsDepth(t.wbs_code),
      packages: byTask.get(t.id) ?? [],
    }))

  return { nodes, packageCount: packages?.length ?? 0, capabilities }
}

export async function createPackage(supabase: SupabaseClient, input: CreatePackageInput) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, input.projectId)
  const roles = await resolveRoles(supabase, user.id, input.projectId)
  assertHasRole(roles, WORKSHOP_WRITE_ROLES)
  const fields = validateCreatePackage(input)

  if (input.parentScheduleNodeId) {
    const { data: task } = await supabase
      .from('project_tasks')
      .select('id, name, wbs_code, msp_uid')
      .eq('id', input.parentScheduleNodeId)
      .eq('project_id', input.projectId)
      .maybeSingle()
    if (!task) throw new WorkshopError('NOT_FOUND', 'ردیف برنامه پیدا نشد')
  }

  const inferred = inferReviewReason({
    flagForReview: fields.flag_for_review,
    parentMissingBasis: false,
  })

  const { data, error } = await supabase
    .from('workshop_packages')
    .insert({
      project_id: input.projectId,
      project_task_id: input.parentScheduleNodeId ?? null,
      parent_package_id: input.parentPackageId ?? null,
      name: fields.name,
      location: fields.location,
      quantity: fields.quantity,
      uom: fields.uom,
      crew: fields.crew,
      note: fields.note,
      status: inferred.flag ? 'needs_review' : 'ready',
      approval_status: 'draft',
      origin: 'user_added',
      flag_for_review: inferred.flag || fields.flag_for_review,
      review_reason: fields.review_reason ?? inferred.note,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()
  if (error) throw new WorkshopError('VALIDATION', error.message)

  if (data.flag_for_review) {
    await supabase.from('workshop_review_flags').insert({
      project_id: input.projectId,
      entity_type: 'package',
      entity_id: data.id,
      reason_code: inferred.reasonCode ?? 'needs_technical_mapping',
      severity: 'warn',
      status: 'open',
      note: data.review_reason,
      created_by: user.id,
    })
  }

  await writeSiteOpsAudit(supabase, {
    projectId: input.projectId,
    actorId: user.id,
    action: 'workshop.package.create',
    entityType: 'workshop_package',
    entityId: data.id,
    payload: { name: data.name, parent_task: input.parentScheduleNodeId },
  })

  return data
}

export async function updatePackage(
  supabase: SupabaseClient,
  packageId: string,
  input: UpdatePackageInput
) {
  const user = await requireUser(supabase)
  const pkg = await loadPackage(supabase, packageId)
  await assertProjectAccess(supabase, user.id, pkg.project_id)
  const roles = await resolveRoles(supabase, user.id, pkg.project_id)
  assertHasRole(roles, WORKSHOP_WRITE_ROLES)

  assertCanEditPackage(pkg.approval_status as ApprovalStatus)

  const fields = normalizeChangePayload(input)
  const dbPatch: Record<string, unknown> = {
    ...fields,
    updated_at: new Date().toISOString(),
  }
  if (input.flagForReview !== undefined) {
    dbPatch.flag_for_review = Boolean(input.flagForReview)
  }
  if (input.reviewReason !== undefined) {
    dbPatch.review_reason = input.reviewReason?.trim() || null
  }

  const { data, error } = await supabase
    .from('workshop_packages')
    .update(dbPatch)
    .eq('id', packageId)
    .select('*')
    .single()
  if (error) throw new WorkshopError('VALIDATION', error.message)

  await writeSiteOpsAudit(supabase, {
    projectId: pkg.project_id,
    actorId: user.id,
    action: 'workshop.package.update',
    entityType: 'workshop_package',
    entityId: packageId,
    payload: { ...fields } as Record<string, unknown>,
  })

  return data
}

export async function deletePackage(supabase: SupabaseClient, packageId: string) {
  const user = await requireUser(supabase)
  const pkg = await loadPackage(supabase, packageId)
  await assertProjectAccess(supabase, user.id, pkg.project_id)
  const roles = await resolveRoles(supabase, user.id, pkg.project_id)
  assertHasRole(roles, WORKSHOP_WRITE_ROLES)
  assertCanDeletePackage(pkg.approval_status as ApprovalStatus)

  const { count, error: childErr } = await supabase
    .from('workshop_packages')
    .select('id', { count: 'exact', head: true })
    .eq('parent_package_id', packageId)
  if (childErr) throw new WorkshopError('VALIDATION', childErr.message)
  if ((count ?? 0) > 0) {
    throw new WorkshopError('VALIDATION', 'ابتدا زیرمجموعه‌های این ردیف را حذف کنید')
  }

  const { error } = await supabase.from('workshop_packages').delete().eq('id', packageId)
  if (error) throw new WorkshopError('VALIDATION', error.message)

  await writeSiteOpsAudit(supabase, {
    projectId: pkg.project_id,
    actorId: user.id,
    action: 'workshop.package.delete',
    entityType: 'workshop_package',
    entityId: packageId,
    payload: { name: pkg.name },
  })

  return { ok: true }
}

export async function submitPackageForApproval(supabase: SupabaseClient, packageId: string) {
  const user = await requireUser(supabase)
  const pkg = await loadPackage(supabase, packageId)
  await assertProjectAccess(supabase, user.id, pkg.project_id)
  const roles = await resolveRoles(supabase, user.id, pkg.project_id)
  assertHasRole(roles, WORKSHOP_WRITE_ROLES)
  assertCanSubmitForApproval(pkg.approval_status as ApprovalStatus)

  const { data, error } = await supabase
    .from('workshop_packages')
    .update({
      approval_status: 'pending_approval',
      last_pm_comment: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', packageId)
    .select('*')
    .single()
  if (error) throw new WorkshopError('VALIDATION', error.message)

  await writeApprovalEvent(supabase, {
    projectId: pkg.project_id,
    packageId,
    eventType: 'submit',
    actorId: user.id,
  })
  await writeSiteOpsAudit(supabase, {
    projectId: pkg.project_id,
    actorId: user.id,
    action: 'workshop.package.submit',
    entityType: 'workshop_package',
    entityId: packageId,
    payload: {},
  })
  return data
}

export async function approvePackage(
  supabase: SupabaseClient,
  packageId: string,
  comment?: string | null
) {
  const user = await requireUser(supabase)
  const pkg = await loadPackage(supabase, packageId)
  await assertProjectAccess(supabase, user.id, pkg.project_id)
  const roles = await resolveRoles(supabase, user.id, pkg.project_id)
  assertHasRole(roles, ['PM', 'SITE_MANAGER'])

  if ((pkg.approval_status as ApprovalStatus) !== 'pending_approval') {
    throw new WorkshopError('VALIDATION', 'فقط موارد در انتظار تأیید قابل تأیید هستند')
  }

  const { data, error } = await supabase
    .from('workshop_packages')
    .update({
      approval_status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      last_pm_comment: comment?.trim() || null,
      pending_change: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', packageId)
    .select('*')
    .single()
  if (error) throw new WorkshopError('VALIDATION', error.message)

  await writeApprovalEvent(supabase, {
    projectId: pkg.project_id,
    packageId,
    eventType: 'approve',
    comment,
    actorId: user.id,
  })
  await writeSiteOpsAudit(supabase, {
    projectId: pkg.project_id,
    actorId: user.id,
    action: 'workshop.package.approve',
    entityType: 'workshop_package',
    entityId: packageId,
    payload: { comment: comment ?? null },
  })
  return data
}

export async function rejectPackage(
  supabase: SupabaseClient,
  packageId: string,
  comment: string
) {
  const user = await requireUser(supabase)
  const pkg = await loadPackage(supabase, packageId)
  await assertProjectAccess(supabase, user.id, pkg.project_id)
  const roles = await resolveRoles(supabase, user.id, pkg.project_id)
  assertHasRole(roles, ['PM', 'SITE_MANAGER'])

  if ((pkg.approval_status as ApprovalStatus) !== 'pending_approval') {
    throw new WorkshopError('VALIDATION', 'فقط موارد در انتظار تأیید قابل رد هستند')
  }
  const note = comment?.trim()
  if (!note) throw new WorkshopError('VALIDATION', 'برای رد کردن، کامنت الزامی است')

  const { data, error } = await supabase
    .from('workshop_packages')
    .update({
      approval_status: 'rejected',
      last_pm_comment: note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', packageId)
    .select('*')
    .single()
  if (error) throw new WorkshopError('VALIDATION', error.message)

  await writeApprovalEvent(supabase, {
    projectId: pkg.project_id,
    packageId,
    eventType: 'reject',
    comment: note,
    actorId: user.id,
  })
  await writeSiteOpsAudit(supabase, {
    projectId: pkg.project_id,
    actorId: user.id,
    action: 'workshop.package.reject',
    entityType: 'workshop_package',
    entityId: packageId,
    payload: { comment: note },
  })
  return data
}

export async function commentOnPackage(
  supabase: SupabaseClient,
  packageId: string,
  comment: string
) {
  const user = await requireUser(supabase)
  const pkg = await loadPackage(supabase, packageId)
  await assertProjectAccess(supabase, user.id, pkg.project_id)
  const roles = await resolveRoles(supabase, user.id, pkg.project_id)
  assertHasRole(roles, ['PM', 'SITE_MANAGER', 'TECHNICAL_OFFICE', 'SUPERVISOR'])

  const note = comment?.trim()
  if (!note) throw new WorkshopError('VALIDATION', 'کامنت خالی است')

  // Keep approval-event trail for PM inbox actions; discussion lives in comments table when available.
  await writeApprovalEvent(supabase, {
    projectId: pkg.project_id,
    packageId,
    eventType: 'comment',
    comment: note,
    actorId: user.id,
  })

  const { data, error } = await supabase
    .from('workshop_package_comments')
    .insert({
      project_id: pkg.project_id,
      package_id: packageId,
      body: note,
      author_id: user.id,
    })
    .select('*')
    .single()

  if (error) {
    // Migration 48 not applied yet — fall back to last_pm_comment only for PM notes
    if (error.code === '42P01') {
      await supabase
        .from('workshop_packages')
        .update({ last_pm_comment: note, updated_at: new Date().toISOString() })
        .eq('id', packageId)
      return { ok: true, comment: null }
    }
    throw new WorkshopError('VALIDATION', error.message)
  }

  return { ok: true, comment: data }
}

async function enrichCommentAuthors(
  supabase: SupabaseClient,
  rows: Array<Record<string, unknown>>
) {
  const ids = [...new Set(rows.map((r) => String(r.author_id)).filter(Boolean))]
  if (ids.length === 0) return rows
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', ids)
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string]))
  return rows.map((r) => ({
    ...r,
    author_name: byId.get(String(r.author_id)) ?? null,
  }))
}

export async function listPackageComments(supabase: SupabaseClient, packageId: string) {
  const user = await requireUser(supabase)
  const pkg = await loadPackage(supabase, packageId)
  await assertProjectAccess(supabase, user.id, pkg.project_id)

  const { data, error } = await supabase
    .from('workshop_package_comments')
    .select('*')
    .eq('package_id', packageId)
    .order('created_at', { ascending: true })

  if (error) {
    if (error.code === '42P01') return { comments: [], currentUserId: user.id }
    throw new WorkshopError('VALIDATION', error.message)
  }

  const comments = await enrichCommentAuthors(supabase, (data ?? []) as Record<string, unknown>[])
  return { comments, currentUserId: user.id }
}

export async function updatePackageComment(
  supabase: SupabaseClient,
  commentId: string,
  body: string
) {
  const user = await requireUser(supabase)
  const note = body?.trim()
  if (!note) throw new WorkshopError('VALIDATION', 'کامنت خالی است')

  const { data: existing, error: findErr } = await supabase
    .from('workshop_package_comments')
    .select('*')
    .eq('id', commentId)
    .maybeSingle()
  if (findErr) throw new WorkshopError('VALIDATION', findErr.message)
  if (!existing) throw new WorkshopError('NOT_FOUND', 'کامنت پیدا نشد')

  await assertProjectAccess(supabase, user.id, existing.project_id)
  if (existing.author_id !== user.id) {
    throw new WorkshopError('FORBIDDEN', 'فقط نویسنده می‌تواند این کامنت را ویرایش کند')
  }

  const { data, error } = await supabase
    .from('workshop_package_comments')
    .update({
      body: note,
      updated_at: new Date().toISOString(),
      edited_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .eq('author_id', user.id)
    .select('*')
    .single()
  if (error) throw new WorkshopError('VALIDATION', error.message)
  return data
}

export async function requestPackageChange(
  supabase: SupabaseClient,
  packageId: string,
  body: { change: UpdatePackageInput; comment?: string | null }
) {
  const user = await requireUser(supabase)
  const pkg = await loadPackage(supabase, packageId)
  await assertProjectAccess(supabase, user.id, pkg.project_id)
  const roles = await resolveRoles(supabase, user.id, pkg.project_id)
  assertHasRole(roles, WORKSHOP_WRITE_ROLES)

  const status = pkg.approval_status as ApprovalStatus
  if (status === 'approved') {
    assertCanRequestChange(status)
  } else if (!canReviseChangeRequest(status)) {
    throw new WorkshopError('VALIDATION', 'در این وضعیت درخواست تغییر مجاز نیست')
  }

  const proposed = normalizeChangePayload(body.change)
  if (Object.keys(proposed).length === 0) {
    throw new WorkshopError('VALIDATION', 'حداقل یک فیلد برای تغییر مشخص کنید')
  }

  const { data, error } = await supabase
    .from('workshop_packages')
    .update({
      approval_status: 'change_requested',
      pending_change: proposed,
      last_pm_comment: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', packageId)
    .select('*')
    .single()
  if (error) throw new WorkshopError('VALIDATION', error.message)

  await writeApprovalEvent(supabase, {
    projectId: pkg.project_id,
    packageId,
    eventType: 'change_request',
    comment: body.comment,
    proposedChange: proposed,
    actorId: user.id,
  })
  await writeSiteOpsAudit(supabase, {
    projectId: pkg.project_id,
    actorId: user.id,
    action: 'workshop.package.change_request',
    entityType: 'workshop_package',
    entityId: packageId,
    payload: { ...proposed } as Record<string, unknown>,
  })
  return data
}

export async function decidePackageChange(
  supabase: SupabaseClient,
  packageId: string,
  body: { decision: 'approve' | 'reject'; comment?: string | null }
) {
  const user = await requireUser(supabase)
  const pkg = await loadPackage(supabase, packageId)
  await assertProjectAccess(supabase, user.id, pkg.project_id)
  const roles = await resolveRoles(supabase, user.id, pkg.project_id)
  assertHasRole(roles, ['PM', 'SITE_MANAGER'])

  if ((pkg.approval_status as ApprovalStatus) !== 'change_requested') {
    throw new WorkshopError('VALIDATION', 'درخواست تغییری در صف نیست')
  }

  if (body.decision === 'approve') {
    const pending = (pkg.pending_change ?? {}) as PackageChangePayload
    const { data, error } = await supabase
      .from('workshop_packages')
      .update({
        ...pending,
        approval_status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        pending_change: null,
        last_pm_comment: body.comment?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', packageId)
      .select('*')
      .single()
    if (error) throw new WorkshopError('VALIDATION', error.message)

    await writeApprovalEvent(supabase, {
      projectId: pkg.project_id,
      packageId,
      eventType: 'change_approve',
      comment: body.comment,
      proposedChange: pending,
      actorId: user.id,
    })
    return data
  }

  const note = body.comment?.trim()
  if (!note) throw new WorkshopError('VALIDATION', 'برای رد درخواست تغییر، کامنت الزامی است')

  const { data, error } = await supabase
    .from('workshop_packages')
    .update({
      approval_status: 'approved',
      pending_change: null,
      last_pm_comment: note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', packageId)
    .select('*')
    .single()
  if (error) throw new WorkshopError('VALIDATION', error.message)

  await writeApprovalEvent(supabase, {
    projectId: pkg.project_id,
    packageId,
    eventType: 'change_reject',
    comment: note,
    actorId: user.id,
  })
  return data
}

export async function listApprovalInbox(supabase: SupabaseClient, projectId: string) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  const roles = await resolveRoles(supabase, user.id, projectId)
  assertHasRole(roles, ['PM', 'SITE_MANAGER', 'TECHNICAL_OFFICE', 'SUPERVISOR', 'PROJECT_CONTROLS'])

  const { data, error } = await supabase
    .from('workshop_packages')
    .select('*')
    .eq('project_id', projectId)
    .in('approval_status', ['pending_approval', 'change_requested'])
    .order('updated_at', { ascending: false })
  if (error) throw new WorkshopError('VALIDATION', error.message)

  const canDecide = roles.some((r) => r === 'PM' || r === 'SITE_MANAGER')
  return { items: data ?? [], canDecide, roles }
}

export async function listPreparedPackages(supabase: SupabaseClient, projectId: string) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  const roles = await resolveRoles(supabase, user.id, projectId)
  assertHasRole(roles, [
    'SUPERVISOR',
    'PM',
    'SITE_MANAGER',
    'TECHNICAL_OFFICE',
    'PROJECT_CONTROLS',
    'VIEWER',
  ])

  // Supervisor sees everything TO prepared, including drafts/rejected + PM status.
  const { data, error } = await supabase
    .from('workshop_packages')
    .select('*')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false })
  if (error) throw new WorkshopError('VALIDATION', error.message)
  return { items: data ?? [], currentUserId: user.id }
}

export async function listPackageEvents(supabase: SupabaseClient, packageId: string) {
  const user = await requireUser(supabase)
  const pkg = await loadPackage(supabase, packageId)
  await assertProjectAccess(supabase, user.id, pkg.project_id)

  const { data, error } = await supabase
    .from('workshop_approval_events')
    .select('*')
    .eq('package_id', packageId)
    .order('created_at', { ascending: false })
  if (error) throw new WorkshopError('VALIDATION', error.message)
  return data ?? []
}

export async function sendToToday(
  supabase: SupabaseClient,
  packageId: string,
  body: { date: string; plannedQty: number }
) {
  const user = await requireUser(supabase)
  const pkg = await loadPackage(supabase, packageId)
  await assertProjectAccess(supabase, user.id, pkg.project_id)
  const roles = await resolveRoles(supabase, user.id, pkg.project_id)
  assertHasRole(roles, WORKSHOP_WRITE_ROLES)
  assertCanSendToToday(pkg.approval_status as ApprovalStatus)

  if (!(body.plannedQty > 0)) throw new WorkshopError('VALIDATION', 'مقدار امروز باید بزرگ‌تر از صفر باشد')

  const { data, error: upErr } = await supabase
    .from('workshop_daily_assignments')
    .upsert(
      {
        project_id: pkg.project_id,
        package_id: packageId,
        plan_date: body.date,
        planned_qty: body.plannedQty,
        status: 'planned',
        created_by: user.id,
      },
      { onConflict: 'package_id,plan_date' }
    )
    .select('*')
    .single()
  if (upErr) throw new WorkshopError('VALIDATION', upErr.message)

  await supabase
    .from('workshop_packages')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', packageId)
    .in('status', ['draft', 'ready', 'needs_review'])

  await writeSiteOpsAudit(supabase, {
    projectId: pkg.project_id,
    actorId: user.id,
    action: 'workshop.send_to_today',
    entityType: 'workshop_assignment',
    entityId: data.id,
    payload: { planned_qty: body.plannedQty, date: body.date },
  })

  return data
}

export async function addActual(
  supabase: SupabaseClient,
  assignmentId: string,
  body: { actualQty: number; status: 'done' | 'partial' | 'blocked'; note?: string | null }
) {
  const user = await requireUser(supabase)
  const { data: asg, error } = await supabase
    .from('workshop_daily_assignments')
    .select('*')
    .eq('id', assignmentId)
    .maybeSingle()
  if (error) throw new WorkshopError('VALIDATION', error.message)
  if (!asg) throw new WorkshopError('NOT_FOUND', 'برنامه امروز پیدا نشد')
  await assertProjectAccess(supabase, user.id, asg.project_id)

  if (body.actualQty < 0) throw new WorkshopError('VALIDATION', 'مقدار واقعی نامعتبر است')

  const { data, error: insErr } = await supabase
    .from('workshop_actual_entries')
    .insert({
      assignment_id: assignmentId,
      actual_qty: body.actualQty,
      status: body.status,
      note: body.note?.trim() || null,
      recorded_by: user.id,
    })
    .select('*')
    .single()
  if (insErr) throw new WorkshopError('VALIDATION', insErr.message)

  await supabase
    .from('workshop_daily_assignments')
    .update({ status: body.status === 'done' ? 'done' : body.status === 'blocked' ? 'blocked' : 'partial' })
    .eq('id', assignmentId)

  await supabase
    .from('workshop_packages')
    .update({
      status: body.status === 'done' ? 'done' : body.status === 'blocked' ? 'blocked' : 'partial',
      updated_at: new Date().toISOString(),
    })
    .eq('id', asg.package_id)

  await writeSiteOpsAudit(supabase, {
    projectId: asg.project_id,
    actorId: user.id,
    action: 'workshop.actual',
    entityType: 'workshop_actual',
    entityId: data.id,
    payload: { actual_qty: body.actualQty, status: body.status },
  })

  return data
}

export async function listToday(supabase: SupabaseClient, projectId: string, date: string) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)

  const { data, error } = await supabase
    .from('workshop_daily_assignments')
    .select('*, workshop_packages(*), workshop_actual_entries(*)')
    .eq('project_id', projectId)
    .eq('plan_date', date)
    .order('created_at', { ascending: true })
  if (error) throw new WorkshopError('VALIDATION', error.message)
  return data ?? []
}

export async function listOpenFlags(supabase: SupabaseClient, projectId: string) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  const { data, error } = await supabase
    .from('workshop_review_flags')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  if (error) throw new WorkshopError('VALIDATION', error.message)
  return data ?? []
}

export function workshopErrorResponse(error: unknown) {
  if (error instanceof WorkshopError) {
    const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'NOT_FOUND' ? 404 : 400
    return NextResponse.json({ error: error.message, code: error.code }, { status })
  }
  if (error instanceof SiteOpsError) {
    const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'NOT_FOUND' ? 404 : 400
    return NextResponse.json({ error: error.message, code: error.code }, { status })
  }
  const message = error instanceof Error ? error.message : 'Workshop error'
  return NextResponse.json({ error: message, code: 'VALIDATION' }, { status: 500 })
}
