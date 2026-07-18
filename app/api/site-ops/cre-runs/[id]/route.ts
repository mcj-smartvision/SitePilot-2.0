import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCreRun } from '@/lib/site-ops/service'
import { siteOpsErrorResponse } from '@/lib/site-ops/http'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const run = await getCreRun(supabase, params.id)
    return NextResponse.json({ run })
  } catch (error) {
    return siteOpsErrorResponse(error)
  }
}
