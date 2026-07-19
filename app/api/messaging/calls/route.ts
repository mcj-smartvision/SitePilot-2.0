import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  listIncomingRingingCalls,
  messagingErrorResponse,
  startCall,
} from '@/lib/messaging/service'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId') ?? ''
    if (!projectId) {
      return NextResponse.json({ error: 'projectId لازم است' }, { status: 400 })
    }
    const supabase = createClient()
    const calls = await listIncomingRingingCalls(supabase, projectId)
    return NextResponse.json({ calls })
  } catch (error) {
    return messagingErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const conversationId = String(body.conversationId ?? '')
    const calleeId = String(body.calleeId ?? '')
    const media = body.media === 'video' ? 'video' : 'audio'
    if (!conversationId || !calleeId) {
      return NextResponse.json({ error: 'conversationId و calleeId لازم است' }, { status: 400 })
    }
    const supabase = createClient()
    const call = await startCall(supabase, { conversationId, calleeId, media })
    return NextResponse.json({ call })
  } catch (error) {
    return messagingErrorResponse(error)
  }
}
