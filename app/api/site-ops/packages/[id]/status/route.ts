import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setPackageStatus } from '@/lib/site-ops/service'
import { siteOpsErrorResponse } from '@/lib/site-ops/http'
import type { PackageStatus } from '@/lib/site-ops-domain'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const status = String(body.status ?? body.ops_status) as PackageStatus
    const pkg = await setPackageStatus(supabase, params.id, status)
    return NextResponse.json({ package: pkg })
  } catch (error) {
    return siteOpsErrorResponse(error)
  }
}
