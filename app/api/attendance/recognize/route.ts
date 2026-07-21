import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  attendanceErrorResponse,
  recognizeAndRecord,
} from '@/lib/attendance/service'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const auto = Boolean(body.auto ?? body.watch)
    const faces = Array.isArray(body.faces)
      ? body.faces.map((f: unknown) => String(f))
      : undefined

    const result = await recognizeAndRecord(supabase, {
      projectId: String(body.projectId ?? body.project_id ?? ''),
      gateId: body.gateId ?? body.gate_id ?? null,
      imageBase64: body.imageBase64 ?? body.image_base64 ?? undefined,
      faces,
      mimeType: body.mimeType ?? body.mime_type ?? 'image/jpeg',
      minConfidence:
        body.minConfidence != null ? Number(body.minConfidence) : 0.6,
      recordFailed: auto ? false : body.recordFailed !== false,
    })
    return NextResponse.json(result)
  } catch (error) {
    return attendanceErrorResponse(error)
  }
}
