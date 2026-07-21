import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getEmailRuntimeStatus } from '@/lib/email/send'
import { requireUser } from '@/lib/site-ops/auth'
import { attendanceErrorResponse } from '@/lib/attendance/service'

export async function GET() {
  try {
    const supabase = createClient()
    await requireUser(supabase)
    return NextResponse.json({ email: getEmailRuntimeStatus() })
  } catch (error) {
    return attendanceErrorResponse(error)
  }
}
