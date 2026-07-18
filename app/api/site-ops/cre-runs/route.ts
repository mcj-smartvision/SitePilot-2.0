import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listCreRuns } from '@/lib/site-ops/service'
import { siteOpsErrorResponse } from '@/lib/site-ops/http'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const projectId = request.nextUrl.searchParams.get('projectId') ?? ''
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required', code: 'VALIDATION' }, { status: 400 })
    }
    const runs = await listCreRuns(supabase, projectId)
    return NextResponse.json({ runs })
  } catch (error) {
    return siteOpsErrorResponse(error)
  }
}
