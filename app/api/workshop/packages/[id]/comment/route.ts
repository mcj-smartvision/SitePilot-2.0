import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { commentOnPackage, workshopErrorResponse } from '@/lib/workshop/service'

type Ctx = { params: { id: string } }

export async function POST(request: NextRequest, { params }: Ctx) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const result = await commentOnPackage(supabase, params.id, String(body.comment ?? ''))
    return NextResponse.json(result)
  } catch (error) {
    return workshopErrorResponse(error)
  }
}
