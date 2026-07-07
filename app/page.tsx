import { LandingPage } from '@/components/landing/landing-page'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchDashboardUserContext } from '@/lib/dashboard/user-context'
import { resolvePostLoginPath } from '@/lib/dashboard/redirect'

export default async function Home() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <LandingPage />
  }

  const context = await fetchDashboardUserContext(supabase, user.id, user.email ?? '')
  redirect(resolvePostLoginPath(context))
}
