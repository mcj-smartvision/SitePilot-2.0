import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decideActual } from '@/lib/site-ops/service'
import { siteOpsErrorResponse } from '@/lib/site-ops/http'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const body = await request.json().catch(() => ({}))
    const approve = body.approve !== false && body.status !== 'REJECTED'
    const actual = await decideActual(supabase, params.id, approve)
    return NextResponse.json({ actual })
  } catch (error) {
    return siteOpsErrorResponse(error)
  }
}
