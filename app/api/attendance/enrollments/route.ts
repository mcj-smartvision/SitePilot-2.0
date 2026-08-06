import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  attendanceErrorResponse,
  deleteEnrollment,
  enrollPerson,
  listEnrollments,
  updateEnrollment,
} from '@/lib/attendance/service'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }
    const enrollments = await listEnrollments(supabase, projectId)
    return NextResponse.json({ enrollments })
  } catch (error) {
    return attendanceErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const embeddingRaw = body.faceEmbedding ?? body.face_embedding ?? body.embedding
    const faceEmbedding = Array.isArray(embeddingRaw)
      ? embeddingRaw.map((n: unknown) => Number(n))
      : []

    const enrollment = await enrollPerson(supabase, {
      projectId: String(body.projectId ?? body.project_id ?? ''),
      userId: String(body.userId ?? body.user_id ?? ''),
      personName: body.personName ?? body.person_name ?? null,
      imageBase64: String(body.imageBase64 ?? body.image_base64 ?? ''),
      mimeType: body.mimeType ?? body.mime_type ?? 'image/jpeg',
      faceEmbedding,
      embeddingModel: body.embeddingModel ?? body.embedding_model ?? undefined,
      sampleCount:
        body.sampleCount != null
          ? Number(body.sampleCount)
          : body.sample_count != null
            ? Number(body.sample_count)
            : undefined,
    })
    return NextResponse.json({ enrollment })
  } catch (error) {
    return attendanceErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const projectId = String(body.projectId ?? body.project_id ?? '')
    const enrollmentId = String(body.enrollmentId ?? body.id ?? '')
    const personName = String(body.personName ?? body.person_name ?? '')
    if (!projectId || !enrollmentId) {
      return NextResponse.json({ error: 'projectId and enrollmentId required' }, { status: 400 })
    }
    const enrollment = await updateEnrollment(supabase, {
      projectId,
      enrollmentId,
      personName,
    })
    return NextResponse.json({ enrollment })
  } catch (error) {
    return attendanceErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    const projectId =
      request.nextUrl.searchParams.get('projectId') ||
      request.nextUrl.searchParams.get('project_id')
    const enrollmentId =
      request.nextUrl.searchParams.get('enrollmentId') ||
      request.nextUrl.searchParams.get('id')
    if (!projectId || !enrollmentId) {
      return NextResponse.json({ error: 'projectId and enrollmentId required' }, { status: 400 })
    }
    const result = await deleteEnrollment(supabase, projectId, enrollmentId)
    return NextResponse.json(result)
  } catch (error) {
    return attendanceErrorResponse(error)
  }
}
