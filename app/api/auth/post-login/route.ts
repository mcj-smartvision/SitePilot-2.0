import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchDashboardUserContext } from '@/lib/dashboard/user-context'
import { resolvePostLoginPath } from '@/lib/dashboard/redirect'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ redirectTo: '/login' })
  }

  const context = await fetchDashboardUserContext(supabase, user.id, user.email)
  return NextResponse.json({ redirectTo: resolvePostLoginPath(context), context })
}
