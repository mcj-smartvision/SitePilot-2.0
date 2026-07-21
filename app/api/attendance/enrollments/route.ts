import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  attendanceErrorResponse,
  enrollPerson,
  listEnrollments,
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
    const enrollment = await enrollPerson(supabase, {
      projectId: String(body.projectId ?? body.project_id ?? ''),
      userId: String(body.userId ?? body.user_id ?? ''),
      personName: body.personName ?? body.person_name ?? null,
      imageBase64: String(body.imageBase64 ?? body.image_base64 ?? ''),
      mimeType: body.mimeType ?? body.mime_type ?? 'image/jpeg',
    })
    return NextResponse.json({ enrollment })
  } catch (error) {
    return attendanceErrorResponse(error)
  }
}
