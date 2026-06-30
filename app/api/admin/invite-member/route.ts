import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/admin/access'
import { createServiceClient } from '@/lib/supabase/service'
import { createProjectMember, findProfileByEmail } from '@/utils/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await isSystemAdmin(supabase, user.id)
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { project_id, full_name, email, phone, is_active, position_ids, send_invite } = body

    if (!project_id || !full_name || !email) {
      return NextResponse.json({ error: 'project_id, full_name, and email are required' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    let profile = await findProfileByEmail(supabase, normalizedEmail)

    if (!profile && send_invite) {
      const service = createServiceClient()
      const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          data: { full_name },
          redirectTo: `${request.nextUrl.origin}/login`,
        }
      )

      if (inviteError) {
        return NextResponse.json({ error: inviteError.message }, { status: 400 })
      }

      if (invited.user) {
        profile = {
          id: invited.user.id,
          email: invited.user.email ?? normalizedEmail,
          full_name,
        }
      }
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            'No user account exists for this email. Enable "Send invite email" or ask the member to sign up first.',
        },
        { status: 400 }
      )
    }

    const member = await createProjectMember(
      supabase,
      project_id,
      profile.id,
      {
        full_name,
        email: normalizedEmail,
        phone,
        is_active: is_active ?? true,
        position_ids: position_ids ?? [],
      },
      user.id
    )

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invite failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
