import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWorkOrder } from '@/lib/site-ops/service'
import { siteOpsErrorResponse } from '@/lib/site-ops/http'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const workOrder = await getWorkOrder(supabase, params.id)
    return NextResponse.json({ workOrder })
  } catch (error) {
    return siteOpsErrorResponse(error)
  }
}
