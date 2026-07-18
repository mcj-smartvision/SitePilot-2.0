import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { promoteRun } from '@/lib/site-ops/service'
import { siteOpsErrorResponse } from '@/lib/site-ops/http'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const body = await request.json().catch(() => ({}))
    const result = await promoteRun(supabase, params.id, {
      force: Boolean(body.force),
      forceReason: body.forceReason ?? body.force_reason,
      taskUids: body.taskUids ?? body.task_uids,
    })
    return NextResponse.json(result)
  } catch (error) {
    return siteOpsErrorResponse(error)
  }
}
