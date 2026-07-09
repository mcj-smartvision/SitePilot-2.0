import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchMemberUiBlockPreferences,
  upsertMemberUiBlockPreference,
} from '@/lib/dashboard/member-ui-block-preferences'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const projectId = request.nextUrl.searchParams.get('project_id') ?? ''
    const dashboard = request.nextUrl.searchParams.get('dashboard') ?? ''

    if (!projectId || !dashboard) {
      return NextResponse.json({ error: 'project_id and dashboard are required' }, { status: 400 })
    }

    const preferences = await fetchMemberUiBlockPreferences(supabase, user.id, projectId, dashboard)
    return NextResponse.json({ preferences })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load preferences'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const projectId = String(body.project_id ?? '')
    const dashboard = String(body.dashboard ?? '')
    const blockCode = String(body.block_code ?? '')
    const isVisible = Boolean(body.is_visible)

    if (!projectId || !dashboard || !blockCode) {
      return NextResponse.json(
        { error: 'project_id, dashboard, and block_code are required' },
        { status: 400 }
      )
    }

    await upsertMemberUiBlockPreference(supabase, {
      userId: user.id,
      projectId,
      dashboard,
      blockCode,
      isVisible,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save preference'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
