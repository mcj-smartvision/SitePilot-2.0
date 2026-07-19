import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { messagingErrorResponse, updateCallStatus } from '@/lib/messaging/service'

type Ctx = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Ctx) {
  try {
    const body = await request.json()
    const status = body.status as 'accepted' | 'ended' | 'rejected' | 'missed'
    if (!['accepted', 'ended', 'rejected', 'missed'].includes(status)) {
      return NextResponse.json({ error: 'status نامعتبر' }, { status: 400 })
    }
    const supabase = createClient()
    const call = await updateCallStatus(supabase, params.id, status)
    return NextResponse.json({ call })
  } catch (error) {
    return messagingErrorResponse(error)
  }
}
