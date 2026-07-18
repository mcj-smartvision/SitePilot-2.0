import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { issuePlan } from '@/lib/site-ops/service'
import { siteOpsErrorResponse } from '@/lib/site-ops/http'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const plan = await issuePlan(supabase, params.id)
    return NextResponse.json({ plan })
  } catch (error) {
    return siteOpsErrorResponse(error)
  }
}
