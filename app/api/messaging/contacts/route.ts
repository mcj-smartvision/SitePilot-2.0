import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listMessengerContacts, messagingErrorResponse } from '@/lib/messaging/service'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId') ?? ''
    if (!projectId) {
      return NextResponse.json({ error: 'projectId لازم است' }, { status: 400 })
    }
    const supabase = createClient()
    const contacts = await listMessengerContacts(supabase, projectId)
    return NextResponse.json({ contacts })
  } catch (error) {
    return messagingErrorResponse(error)
  }
}
