'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocale } from '@/components/i18n/locale-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { HardHat, Lock, User, ArrowRight } from 'lucide-react'
import { normalizeLoginIdentifier } from '@/lib/auth/login-identifier'
import { HeaderLanguageSwitcher } from '@/components/i18n/header-language-switcher'
import { HeaderCalendarSwitcher } from '@/components/schedule/header-calendar-switcher'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { app } = useLocale()
  const redirectParam = searchParams.get('redirect')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const authEmail = normalizeLoginIdentifier(identifier)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    })

    if (signInError) {
      const msg = signInError.message.toLowerCase()
      if (msg.includes('fetch failed') || msg.includes('network')) {
        setError(
          'Cannot reach Supabase. Check internet/VPN, then restart the dev server (only one npm run dev on port 3000).'
        )
      } else if (msg.includes('invalid login credentials')) {
        setError('Wrong email or password.')
      } else {
        setError(signInError.message)
      }
      setLoading(false)
      return
    }

    if (redirectParam && redirectParam !== '/login') {
      router.push(redirectParam)
      router.refresh()
      return
    }

    try {
      const res = await fetch('/api/auth/post-login')
      const data = await res.json()
      router.push(data.redirectTo ?? '/dashboard')
    } catch {
      router.push('/dashboard')
    }
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 industrial-gradient relative">
      <div className="absolute inset-0 site-grid-bg opacity-10 pointer-events-none" />
      <div className="absolute top-4 end-4 z-10 flex flex-wrap items-center justify-end gap-2">
        <HeaderCalendarSwitcher />
        <HeaderLanguageSwitcher />
      </div>

      <div className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-background/95 backdrop-blur-sm shadow-elevated p-8 sm:p-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
            <HardHat className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SitePilot</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
            Construction Operations
          </p>
        </div>

        <div className="space-y-2 mb-6 text-center">
          <h2 className="text-lg font-semibold">{app.signIn}</h2>
          <p className="text-muted-foreground text-sm">
            Enter your credentials to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="identifier">{app.email}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="pl-10 h-11"
                placeholder="mojtaba421@gmail.com"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{app.password}</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                {app.forgotPassword}
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 h-11"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading ? 'Signing in...' : (
              <>
                {app.signIn}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Access by invitation only.
        </p>
      </div>
    </div>
  )
}
