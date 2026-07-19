import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getOrCreateDirectConversation,
  listConversations,
  messagingErrorResponse,
  unreadTotal,
} from '@/lib/messaging/service'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId') ?? ''
    if (!projectId) {
      return NextResponse.json({ error: 'projectId لازم است' }, { status: 400 })
    }
    const supabase = createClient()
    const [conversations, unread] = await Promise.all([
      listConversations(supabase, projectId),
      unreadTotal(supabase, projectId),
    ])
    return NextResponse.json({ conversations, unread })
  } catch (error) {
    return messagingErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const projectId = String(body.projectId ?? '')
    const peerUserId = String(body.peerUserId ?? body.userId ?? '')
    if (!projectId || !peerUserId) {
      return NextResponse.json({ error: 'projectId و peerUserId لازم است' }, { status: 400 })
    }
    const supabase = createClient()
    const conversation = await getOrCreateDirectConversation(supabase, projectId, peerUserId)
    return NextResponse.json({ conversation })
  } catch (error) {
    return messagingErrorResponse(error)
  }
}
