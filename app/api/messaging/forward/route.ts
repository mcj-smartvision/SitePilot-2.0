import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { forwardMessage, messagingErrorResponse } from '@/lib/messaging/service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const messageId = String(body.messageId ?? '')
    const targetConversationId = String(body.targetConversationId ?? '')
    if (!messageId || !targetConversationId) {
      return NextResponse.json(
        { error: 'messageId و targetConversationId لازم است' },
        { status: 400 }
      )
    }
    const supabase = createClient()
    const msg = await forwardMessage(supabase, messageId, targetConversationId)
    return NextResponse.json({ message: msg })
  } catch (error) {
    return messagingErrorResponse(error)
  }
}
