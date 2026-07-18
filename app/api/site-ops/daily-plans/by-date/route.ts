import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlanByDate } from '@/lib/site-ops/service'
import { siteOpsErrorResponse } from '@/lib/site-ops/http'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const projectId = request.nextUrl.searchParams.get('projectId') ?? ''
    const planDate = request.nextUrl.searchParams.get('date') ?? ''
    if (!projectId || !planDate) {
      return NextResponse.json(
        { error: 'projectId and date are required', code: 'VALIDATION' },
        { status: 400 }
      )
    }
    const bundle = await getPlanByDate(supabase, projectId, planDate)
    return NextResponse.json({ bundle })
  } catch (error) {
    return siteOpsErrorResponse(error)
  }
}
