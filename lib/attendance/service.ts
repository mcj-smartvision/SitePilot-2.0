import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isSystemAdmin } from '@/lib/admin/access'
import { sendEmail } from '@/lib/email/send'
import { resolveNotifyEmail } from '@/lib/auth/login-identifier'
import {
  assertProjectAccess,
  loadMemberPositionKeys,
  requireUser,
} from '@/lib/site-ops/auth'
import { SiteOpsError } from '@/lib/site-ops-domain/errors'
import {
  AttendanceError,
  buildPresence,
  endOfLocalDayIso,
  formatDurationFa,
  localDateKey,
  nextDirection,
  startOfLocalDayIso,
} from './domain'
import type {
  AttendanceDashboardSnapshot,
  AttendanceEnrollment,
  AttendanceGate,
  AttendanceTransit,
  BindGateCameraInput,
  CreateGateInput,
  EnrollPersonInput,
  RecordTransitInput,
  TransitDirection,
} from './types'

const WRITE_POSITIONS = new Set(['security', 'site_manager', 'project_manager'])
const READ_POSITIONS = new Set([
  'security',
  'site_manager',
  'project_manager',
  'planning_engineer',
  'technical_office',
])

function mapGate(row: Record<string, unknown>): AttendanceGate {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    cameraLabel: (row.camera_label as string) ?? null,
    cameraDeviceId: (row.camera_device_id as string) ?? null,
    cameraGroupId: (row.camera_group_id as string) ?? null,
    locationNote: (row.location_note as string) ?? null,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
  }
}

function mapTransit(row: Record<string, unknown>): AttendanceTransit {
  const gate = row.attendance_gates as { name?: string } | null | undefined
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    userId: (row.user_id as string) ?? null,
    gateId: (row.gate_id as string) ?? null,
    direction: row.direction as TransitDirection,
    source: row.source as AttendanceTransit['source'],
    identificationStatus: row.identification_status as AttendanceTransit['identificationStatus'],
    personName: (row.person_name as string) ?? null,
    personEmail: (row.person_email as string) ?? null,
    personnelCode: (row.personnel_code as string) ?? null,
    occurredAt: String(row.occurred_at),
    recordedBy: (row.recorded_by as string) ?? null,
    notes: (row.notes as string) ?? null,
    emailStatus: row.email_status as AttendanceTransit['emailStatus'],
    emailSentAt: (row.email_sent_at as string) ?? null,
    emailError: (row.email_error as string) ?? null,
    gateName: gate?.name ?? null,
  }
}

async function assertCanRead(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
) {
  const admin = await isSystemAdmin(supabase, userId)
  if (admin) return
  const keys = await loadMemberPositionKeys(supabase, userId, projectId)
  if (keys.some((k) => READ_POSITIONS.has(k))) return
  throw new AttendanceError('FORBIDDEN', 'دسترسی مشاهده حضور و غیاب ندارید')
}

async function assertCanWrite(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
) {
  const admin = await isSystemAdmin(supabase, userId)
  if (admin) return
  const keys = await loadMemberPositionKeys(supabase, userId, projectId)
  if (keys.some((k) => WRITE_POSITIONS.has(k))) return
  throw new AttendanceError('FORBIDDEN', 'دسترسی ثبت تردد ندارید')
}

async function loadActiveMembers(
  supabase: SupabaseClient,
  projectId: string
): Promise<
  Array<{ userId: string; fullName: string; email: string | null; personnelCode: string | null }>
> {
  const { data, error } = await supabase
    .from('v_project_members_with_positions')
    .select('user_id, full_name, email, contact_email, personnel_code')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('full_name')

  if (error) throw new AttendanceError('VALIDATION', error.message)

  return (data ?? []).map((r) => ({
    userId: String(r.user_id),
    fullName: String(r.full_name || r.email || 'بدون نام'),
    email: resolveNotifyEmail({
      contactEmail: (r.contact_email as string) ?? null,
      email: (r.email as string) ?? null,
    }),
    personnelCode: (r.personnel_code as string) ?? null,
  }))
}

export async function listGates(supabase: SupabaseClient, projectId: string) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  await assertCanRead(supabase, user.id, projectId)

  const { data, error } = await supabase
    .from('attendance_gates')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')
    .order('name')

  if (error) throw new AttendanceError('VALIDATION', error.message)
  return (data ?? []).map((r) => mapGate(r as Record<string, unknown>))
}

export async function createGate(supabase: SupabaseClient, input: CreateGateInput) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, input.projectId)
  await assertCanWrite(supabase, user.id, input.projectId)

  const name = input.name.trim()
  if (!name) throw new AttendanceError('VALIDATION', 'نام گیت الزامی است')

  const { data, error } = await supabase
    .from('attendance_gates')
    .insert({
      project_id: input.projectId,
      name,
      camera_label: input.cameraLabel?.trim() || null,
      location_note: input.locationNote?.trim() || null,
    })
    .select('*')
    .single()

  if (error) throw new AttendanceError('VALIDATION', error.message)
  return mapGate(data as Record<string, unknown>)
}

export async function bindGateCamera(supabase: SupabaseClient, input: BindGateCameraInput) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, input.projectId)
  await assertCanWrite(supabase, user.id, input.projectId)

  if (!input.cameraDeviceId.trim()) {
    throw new AttendanceError('VALIDATION', 'دوربین انتخاب نشده است')
  }

  const { data, error } = await supabase
    .from('attendance_gates')
    .update({
      camera_device_id: input.cameraDeviceId.trim(),
      camera_group_id: input.cameraGroupId?.trim() || null,
      camera_label: input.cameraLabel?.trim() || null,
    })
    .eq('id', input.gateId)
    .eq('project_id', input.projectId)
    .select('*')
    .single()

  if (error) throw new AttendanceError('VALIDATION', error.message)
  return mapGate(data as Record<string, unknown>)
}

function mapEnrollment(
  row: Record<string, unknown>,
  imageUrl: string | null = null
): AttendanceEnrollment {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    userId: String(row.user_id),
    imagePath: String(row.image_path),
    personName: (row.person_name as string) ?? null,
    enrolledBy: (row.enrolled_by as string) ?? null,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    imageUrl,
  }
}

async function signedFaceUrl(supabase: SupabaseClient, path: string) {
  const { data, error } = await supabase.storage
    .from('attendance-faces')
    .createSignedUrl(path, 60 * 30)
  if (error) return null
  return data.signedUrl
}

export async function listEnrollments(supabase: SupabaseClient, projectId: string) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  await assertCanRead(supabase, user.id, projectId)

  const { data, error } = await supabase
    .from('attendance_enrollments')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .order('person_name')

  if (error) throw new AttendanceError('VALIDATION', error.message)

  const rows = data ?? []
  return Promise.all(
    rows.map(async (r) => {
      const url = await signedFaceUrl(supabase, String(r.image_path))
      return mapEnrollment(r as Record<string, unknown>, url)
    })
  )
}

function decodeBase64Image(imageBase64: string, mimeType = 'image/jpeg') {
  const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, '')
  const buffer = Buffer.from(cleaned, 'base64')
  if (buffer.length < 100) throw new AttendanceError('VALIDATION', 'تصویر نامعتبر است')
  if (buffer.length > 4_000_000) throw new AttendanceError('VALIDATION', 'حجم تصویر زیاد است')
  const ext = mimeType.includes('png') ? 'png' : 'jpg'
  return { buffer, ext, mimeType: mimeType.includes('png') ? 'image/png' : 'image/jpeg' }
}

export async function enrollPerson(supabase: SupabaseClient, input: EnrollPersonInput) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, input.projectId)
  await assertCanWrite(supabase, user.id, input.projectId)

  const members = await loadActiveMembers(supabase, input.projectId)
  const member = members.find((m) => m.userId === input.userId)
  if (!member) throw new AttendanceError('VALIDATION', 'فرد عضو فعال پروژه نیست')

  const { buffer, ext, mimeType } = decodeBase64Image(
    input.imageBase64,
    input.mimeType || 'image/jpeg'
  )
  const path = `${input.projectId}/${input.userId}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('attendance-faces')
    .upload(path, buffer, { contentType: mimeType, upsert: true })
  if (uploadError) throw new AttendanceError('VALIDATION', uploadError.message)

  const personName = input.personName?.trim() || member.fullName

  const { data, error } = await supabase
    .from('attendance_enrollments')
    .upsert(
      {
        project_id: input.projectId,
        user_id: input.userId,
        image_path: path,
        person_name: personName,
        enrolled_by: user.id,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,user_id' }
    )
    .select('*')
    .single()

  if (error) throw new AttendanceError('VALIDATION', error.message)
  const url = await signedFaceUrl(supabase, path)
  return mapEnrollment(data as Record<string, unknown>, url)
}

type VisionMatch = { userId: string | null; confidence: number; reason: string }

async function matchFaceWithVision(
  liveDataUrl: string,
  gallery: Array<{ userId: string; personName: string; imageUrl: string; personnelCode?: string | null }>
): Promise<VisionMatch> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new AttendanceError(
      'VALIDATION',
      'شناسایی چهره نیاز به OPENAI_API_KEY دارد'
    )
  }
  if (gallery.length === 0) {
    return { userId: null, confidence: 0, reason: 'no_enrollments' }
  }

  // Keep gallery small + low detail for gate latency (target ~2–4s, not 15–20s)
  const refs = gallery.slice(0, 8)
  const content: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text:
        'Gate face match. LIVE is a face crop. Pick the same person from references. ' +
        'Ignore background/hat/lighting. JSON only: {"userId":"<uuid|null>","confidence":0-1,"reason":"short"}. ' +
        'userId only if confidence>=0.6.\n' +
        refs
          .map(
            (g, i) =>
              `${i + 1}. userId=${g.userId} name=${g.personName}${g.personnelCode ? ` code=${g.personnelCode}` : ''}`
          )
          .join('\n'),
    },
    { type: 'image_url', image_url: { url: liveDataUrl, detail: 'low' } },
  ]

  for (const g of refs) {
    content.push({
      type: 'text',
      text: `Ref ${g.personName} (${g.userId}):`,
    })
    content.push({
      type: 'image_url',
      image_url: { url: g.imageUrl, detail: 'low' },
    })
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 80,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content }],
    }),
  })

  const body = (await res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string }
  }
  if (!res.ok) {
    throw new AttendanceError('VALIDATION', body.error?.message || `Vision HTTP ${res.status}`)
  }

  const raw = body.choices?.[0]?.message?.content || '{}'
  let parsed: { userId?: string | null; confidence?: number; reason?: string }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { userId: null, confidence: 0, reason: 'parse_error' }
  }

  const userId = parsed.userId && gallery.some((g) => g.userId === parsed.userId) ? parsed.userId : null
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0)))
  return { userId, confidence, reason: parsed.reason || '' }
}

/** Capture-based identify: one or many face crops → match + record. */
export async function recognizeAndRecord(
  supabase: SupabaseClient,
  input: {
    projectId: string
    gateId?: string | null
    imageBase64?: string
    /** Multiple face crops from client detector (preferred) */
    faces?: string[]
    mimeType?: string
    minConfidence?: number
    recordFailed?: boolean
  }
) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, input.projectId)
  await assertCanWrite(supabase, user.id, input.projectId)

  const enrollments = await listEnrollments(supabase, input.projectId)
  if (enrollments.length === 0) {
    throw new AttendanceError(
      'VALIDATION',
      'هنوز کسی شناسایی اولیه نشده. اول از دوربین برای فرد ثبت چهره کنید.'
    )
  }

  const members = await loadActiveMembers(supabase, input.projectId)
  const codeByUser = new Map(members.map((m) => [m.userId, m.personnelCode]))

  const gallery = enrollments
    .filter((e) => e.imageUrl)
    .map((e) => ({
      userId: e.userId,
      personName: e.personName || 'بدون نام',
      imageUrl: e.imageUrl!,
      personnelCode: codeByUser.get(e.userId) ?? null,
    }))

  const facePayloads =
    input.faces && input.faces.length > 0
      ? input.faces
      : input.imageBase64
        ? [input.imageBase64]
        : []

  if (facePayloads.length === 0) {
    throw new AttendanceError('VALIDATION', 'تصویر چهره ارسال نشده است')
  }

  const minConfidence = input.minConfidence ?? 0.6
  const recordFailed = input.recordFailed !== false
  const results: Array<{
    matched: boolean
    confidence: number
    reason: string
    transit: AttendanceTransit | null
    enrollment: AttendanceEnrollment | null
    duplicate?: boolean
    personName?: string | null
  }> = []

  const matchedUserIds = new Set<string>()
  // Auto/gate path: match largest faces first; cap at 2 to keep latency low
  const facesToMatch = facePayloads.slice(0, 2)

  for (const face of facesToMatch) {
    const { mimeType } = decodeBase64Image(face, input.mimeType || 'image/jpeg')
    const liveDataUrl = face.startsWith('data:')
      ? face
      : `data:${mimeType};base64,${face}`

    const match = await matchFaceWithVision(liveDataUrl, gallery)

    if (!match.userId || match.confidence < minConfidence) {
      if (recordFailed && facePayloads.length === 1) {
        const failed = await recordTransit(supabase, {
          projectId: input.projectId,
          gateId: input.gateId,
          userId: null,
          personName: null,
          source: 'camera',
          identificationStatus: 'failed',
          notes: `شناسایی ناموفق (confidence=${match.confidence.toFixed(2)}) ${match.reason}`,
        })
        results.push({
          matched: false,
          confidence: match.confidence,
          reason: match.reason,
          transit: failed,
          enrollment: null,
        })
      } else {
        results.push({
          matched: false,
          confidence: match.confidence,
          reason: match.reason,
          transit: null,
          enrollment: null,
        })
      }
      continue
    }

    if (matchedUserIds.has(match.userId)) {
      results.push({
        matched: true,
        confidence: match.confidence,
        reason: 'already_matched_in_frame',
        transit: null,
        enrollment: enrollments.find((e) => e.userId === match.userId) ?? null,
        duplicate: true,
        personName: enrollments.find((e) => e.userId === match.userId)?.personName,
      })
      continue
    }
    matchedUserIds.add(match.userId)

    const enrollment = enrollments.find((e) => e.userId === match.userId) ?? null

    const { data: recent } = await supabase
      .from('attendance_transits')
      .select('*, attendance_gates(name)')
      .eq('project_id', input.projectId)
      .eq('user_id', match.userId)
      .eq('identification_status', 'success')
      .gte('occurred_at', new Date(Date.now() - 45_000).toISOString())
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recent) {
      results.push({
        matched: true,
        confidence: match.confidence,
        reason: 'duplicate_within_cooldown',
        transit: mapTransit(recent as Record<string, unknown>),
        enrollment,
        duplicate: true,
        personName: enrollment?.personName,
      })
      continue
    }

    const transit = await recordTransit(supabase, {
      projectId: input.projectId,
      gateId: input.gateId,
      userId: match.userId,
      personName: enrollment?.personName,
      source: 'camera',
      identificationStatus: 'success',
      notes: `شناسایی دوربین confidence=${match.confidence.toFixed(2)}`,
    })

    results.push({
      matched: true,
      confidence: match.confidence,
      reason: match.reason,
      transit,
      enrollment,
      duplicate: false,
      personName: enrollment?.personName,
    })
  }

  const primary =
    results.find((r) => r.matched && r.transit && !r.duplicate) ||
    results.find((r) => r.matched && r.transit) ||
    results[0]

  return {
    matched: Boolean(primary?.matched && primary.transit),
    confidence: primary?.confidence ?? 0,
    reason: primary?.reason ?? '',
    transit: primary?.transit ?? null,
    enrollment: primary?.enrollment ?? null,
    duplicate: Boolean(primary?.duplicate),
    results,
    faceCount: facePayloads.length,
    matchedCount: results.filter((r) => r.matched && r.transit && !r.duplicate).length,
  }
}

export async function listTransits(
  supabase: SupabaseClient,
  projectId: string,
  opts?: { limit?: number; since?: string; until?: string }
) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  await assertCanRead(supabase, user.id, projectId)

  let q = supabase
    .from('attendance_transits')
    .select('*, attendance_gates(name)')
    .eq('project_id', projectId)
    .order('occurred_at', { ascending: false })
    .limit(opts?.limit ?? 100)

  if (opts?.since) q = q.gte('occurred_at', opts.since)
  if (opts?.until) q = q.lte('occurred_at', opts.until)

  const { data, error } = await q
  if (error) throw new AttendanceError('VALIDATION', error.message)
  return (data ?? []).map((r) => mapTransit(r as Record<string, unknown>))
}

async function lastSuccessfulDirection(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<TransitDirection | null> {
  const { data } = await supabase
    .from('attendance_transits')
    .select('direction')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('identification_status', 'success')
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data?.direction as TransitDirection) ?? null
}

async function notifyTransit(
  supabase: SupabaseClient,
  transit: AttendanceTransit,
  recipient: { userId: string; email: string | null; fullName: string },
  projectName: string
) {
  const dirLabel = transit.direction === 'IN' ? 'ورود' : 'خروج'
  const statusAfter = transit.direction === 'IN' ? 'داخل کارگاه' : 'خارج از کارگاه'
  const when = new Date(transit.occurredAt).toLocaleString('fa-IR')
  const subject = `ثبت ${dirLabel} — ${recipient.fullName}`
  const text = [
    `سلام ${recipient.fullName}،`,
    '',
    `${dirLabel} شما در پروژه «${projectName}» ثبت شد.`,
    `ساعت: ${when}`,
    transit.gateName ? `گیت: ${transit.gateName}` : null,
    `وضعیت فعلی: ${statusAfter}`,
    '',
    'اگر این تردد مربوط به شما نیست، فوراً به حراست اطلاع دهید.',
  ]
    .filter(Boolean)
    .join('\n')

  const notifyRows: Array<Record<string, unknown>> = [
    {
      user_id: recipient.userId,
      project_id: transit.projectId,
      title: subject,
      body: `${dirLabel} ثبت شد — ${when}${transit.gateName ? ` — ${transit.gateName}` : ''}`,
      notification_type: 'success',
      href: '/dashboard/security',
      related_entity_type: 'attendance_transit',
      related_entity_id: transit.id,
    },
  ]

  // Also ping security / PM / site manager members (in-app)
  const { data: staffRows } = await supabase
    .from('v_project_members_with_positions')
    .select('user_id, email, contact_email, full_name, positions')
    .eq('project_id', transit.projectId)
    .eq('is_active', true)

  const staffEmails: string[] = []
  for (const row of staffRows ?? []) {
    const keys = ((row.positions as Array<{ key?: string }>) ?? [])
      .map((p) => p.key)
      .filter(Boolean) as string[]
    const isStaff = keys.some((k) =>
      ['security', 'project_manager', 'site_manager'].includes(k)
    )
    if (!isStaff) continue
    if (row.user_id && row.user_id !== recipient.userId) {
      notifyRows.push({
        user_id: row.user_id,
        project_id: transit.projectId,
        title: `حراست: ${dirLabel} ${recipient.fullName}`,
        body: `${when}${transit.gateName ? ` — ${transit.gateName}` : ''}`,
        notification_type: 'info',
        href: '/dashboard/security',
        related_entity_type: 'attendance_transit',
        related_entity_id: transit.id,
      })
    }
    const em = resolveNotifyEmail({
      contactEmail: (row.contact_email as string) ?? null,
      email: (row.email as string) ?? null,
    })
    if (em) staffEmails.push(em)
  }

  if (notifyRows.length) {
    await supabase.from('app_notifications').insert(notifyRows)
  }

  const notifyExtra = process.env.ATTENDANCE_NOTIFY_EMAIL?.trim()
  const emailTargets = [
    recipient.email || '',
    ...staffEmails,
    ...(notifyExtra ? [notifyExtra] : []),
  ].filter(Boolean)

  // Email must not block gate feedback — send in background
  void (async () => {
    const emailResult = await sendEmail({
      to: emailTargets,
      subject,
      text,
    })
    let emailStatus: AttendanceTransit['emailStatus'] = 'failed'
    let errorMessage: string | null = null
    if (emailResult.ok === false) {
      errorMessage = emailResult.error
      emailStatus = emailResult.skipped ? 'skipped' : 'failed'
    } else {
      emailStatus = 'sent'
    }
    await supabase.from('attendance_email_log').insert({
      transit_id: transit.id,
      project_id: transit.projectId,
      recipient_user_id: recipient.userId,
      recipient_email: emailTargets.join(', ') || '(none)',
      subject,
      status: emailStatus,
      provider: emailResult.provider,
      error_message: errorMessage,
      sent_at: emailResult.ok ? new Date().toISOString() : null,
    })
    await supabase
      .from('attendance_transits')
      .update({
        email_status: emailStatus,
        email_sent_at: emailResult.ok ? new Date().toISOString() : null,
        email_error: errorMessage,
      })
      .eq('id', transit.id)
  })().catch(() => undefined)

  return {
    ...transit,
    emailStatus: 'pending' as const,
    emailSentAt: null,
    emailError: null,
    personEmail: recipient.email,
  }
}

export async function recordTransit(supabase: SupabaseClient, input: RecordTransitInput) {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, input.projectId)
  await assertCanWrite(supabase, user.id, input.projectId)

  const status = input.identificationStatus ?? 'success'
  const source = input.source ?? 'manual_guard'
  let personName = input.personName?.trim() || null
  let userId = input.userId ?? null

  if (status === 'success' && !userId) {
    throw new AttendanceError('VALIDATION', 'برای ثبت موفق باید فرد انتخاب شود')
  }

  let personEmail: string | null = null
  let personnelCode: string | null = null
  let memberForNotify: {
    userId: string
    fullName: string
    email: string | null
    personnelCode: string | null
  } | null = null

  if (userId) {
    const members = await loadActiveMembers(supabase, input.projectId)
    const member = members.find((m) => m.userId === userId)
    if (!member) {
      throw new AttendanceError('VALIDATION', 'این فرد عضو فعال پروژه نیست')
    }
    personName = personName || member.fullName
    personEmail = member.email
    personnelCode = member.personnelCode
    memberForNotify = member
  }

  let direction = input.direction ?? null
  if (!direction) {
    if (status === 'success' && userId) {
      const last = await lastSuccessfulDirection(supabase, input.projectId, userId)
      direction = nextDirection(last)
    } else {
      direction = 'IN'
    }
  }

  const { data, error } = await supabase
    .from('attendance_transits')
    .insert({
      project_id: input.projectId,
      user_id: userId,
      gate_id: input.gateId || null,
      direction,
      source,
      identification_status: status,
      person_name: personName,
      person_email: personEmail,
      personnel_code: personnelCode,
      notes: input.notes?.trim() || null,
      occurred_at: input.occurredAt || new Date().toISOString(),
      recorded_by: user.id,
      email_status: status === 'success' && userId ? 'pending' : 'skipped',
    })
    .select('*, attendance_gates(name)')
    .single()

  if (error) throw new AttendanceError('VALIDATION', error.message)

  let transit = mapTransit(data as Record<string, unknown>)

  if (status === 'success' && userId && memberForNotify) {
    const projectNamePromise = supabase
      .from('projects')
      .select('name')
      .eq('id', input.projectId)
      .maybeSingle()

    // Never block gate UI on notifications/email
    const recipient = memberForNotify
    void (async () => {
      const { data: project } = await projectNamePromise
      await notifyTransit(
        supabase,
        transit,
        recipient,
        project?.name || 'پروژه'
      )
    })().catch(() => undefined)
  }

  return transit
}

export async function getAttendanceDashboard(
  supabase: SupabaseClient,
  projectId: string,
  date = new Date()
): Promise<AttendanceDashboardSnapshot> {
  const user = await requireUser(supabase)
  await assertProjectAccess(supabase, user.id, projectId)
  await assertCanRead(supabase, user.id, projectId)

  const since = startOfLocalDayIso(date)
  const until = endOfLocalDayIso(date)
  const dateKey = localDateKey(date)

  const [gates, members, transits] = await Promise.all([
    listGates(supabase, projectId),
    loadActiveMembers(supabase, projectId),
    listTransits(supabase, projectId, { limit: 500, since, until }),
  ])

  const successfulAsc = [...transits]
    .filter((t) => t.identificationStatus === 'success')
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())

  const presence = buildPresence(members, successfulAsc)
  const inside = presence.filter((p) => p.status === 'inside')
  const outsideToday = presence.filter((p) => p.status === 'outside')
  const absent = presence.filter((p) => p.status === 'absent')
  const failed = transits.filter((t) => t.identificationStatus !== 'success')

  return {
    date: dateKey,
    gates,
    recentTransits: transits.slice(0, 80),
    failedTransits: failed.slice(0, 40),
    inside,
    outsideToday,
    absent,
    kpis: {
      insideCount: inside.length,
      outsideCount: outsideToday.length,
      absentCount: absent.length,
      transitCountToday: successfulAsc.length,
      failedCountToday: failed.length,
    },
  }
}

export { formatDurationFa }

export function attendanceErrorResponse(error: unknown) {
  if (error instanceof AttendanceError) {
    const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'NOT_FOUND' ? 404 : 400
    return NextResponse.json({ error: error.message, code: error.code }, { status })
  }
  if (error instanceof SiteOpsError) {
    const status = error.code === 'FORBIDDEN' ? 403 : error.code === 'NOT_FOUND' ? 404 : 400
    return NextResponse.json({ error: error.message, code: error.code }, { status })
  }
  const message = error instanceof Error ? error.message : 'Attendance error'
  return NextResponse.json({ error: message, code: 'VALIDATION' }, { status: 500 })
}
