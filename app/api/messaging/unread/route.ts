import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { messagingErrorResponse, unreadTotal } from '@/lib/messaging/service'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId') ?? ''
    if (!projectId) {
      return NextResponse.json({ error: 'projectId لازم است' }, { status: 400 })
    }
    const supabase = createClient()
    const unread = await unreadTotal(supabase, projectId)
    return NextResponse.json({ unread })
  } catch (error) {
    return messagingErrorResponse(error)
  }
}
