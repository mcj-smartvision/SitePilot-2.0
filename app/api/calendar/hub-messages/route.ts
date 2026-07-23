import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Feed for Team Calendar: public project hub messages.
 * Auth: header X-Team-Calendar-Key must match TEAM_CALENDAR_API_KEY
 *
 * GET /api/calendar/hub-messages?projectId=UUID&limit=50
 */
export async function GET(request: NextRequest) {
  try {
    const expected = process.env.TEAM_CALENDAR_API_KEY || ''
    const key = request.headers.get('x-team-calendar-key') || ''
    if (!expected || key !== expected) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const projectId = request.nextUrl.searchParams.get('projectId') || ''
    if (!projectId) {
      return NextResponse.json({ error: 'projectId لازم است' }, { status: 400 })
    }

    const limit = Math.min(
      100,
      Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 50)),
    )

    const supabase = createServiceClient()

    let hubId: string | null = null
    {
      const byFlag = await supabase
        .from('project_conversations')
        .select('id, subject')
        .eq('project_id', projectId)
        .eq('is_project_hub', true)
        .limit(1)
        .maybeSingle()
      hubId = byFlag.data?.id ?? null
    }

    if (!hubId) {
      const bySubject = await supabase
        .from('project_conversations')
        .select('id')
        .eq('project_id', projectId)
        .eq('kind', 'group')
        .ilike('subject', '%عمومی%')
        .limit(1)
        .maybeSingle()
      hubId = bySubject.data?.id ?? null
    }

    if (!hubId) {
      return NextResponse.json({
        projectId,
        conversationId: null,
        messages: [],
        hint: 'گروه عمومی پروژه پیدا نشد',
      })
    }

    const { data: rows, error } = await supabase
      .from('project_messages')
      .select('id, conversation_id, sender_id, body, created_at')
      .eq('conversation_id', hubId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const senderIds = [...new Set((rows ?? []).map((m) => m.sender_id))]
    const nameById = new Map<string, string>()
    if (senderIds.length > 0) {
      const { data: members } = await supabase
        .from('v_project_members_with_positions')
        .select('user_id, full_name, email')
        .eq('project_id', projectId)
        .in('user_id', senderIds)
      for (const p of members ?? []) {
        nameById.set(String(p.user_id), String(p.full_name || p.email || 'کاربر'))
      }
    }

    const messages = (rows ?? []).map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderName: nameById.get(m.sender_id) || 'کاربر',
      body: m.body || '',
      createdAt: m.created_at,
    }))

    return NextResponse.json({
      projectId,
      conversationId: hubId,
      messages,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
