import { NextResponse } from 'next/server'
import { getPublicEnvStatus } from '@/lib/env/public'

export const dynamic = 'force-dynamic'

/** Quick deployment / config check — open /api/health in browser */
export async function GET() {
  const env = getPublicEnvStatus()
  const ok = env.supabaseConfigured

  return NextResponse.json(
    {
      status: ok ? 'ok' : 'misconfigured',
      message: ok
        ? 'SitePilot API is running.'
        : 'Supabase environment variables are missing on this deployment.',
      env,
      hints: ok
        ? []
        : [
            'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Project → Settings → Environment Variables.',
            'Redeploy after saving variables.',
          ],
    },
    { status: ok ? 200 : 503 }
  )
}
