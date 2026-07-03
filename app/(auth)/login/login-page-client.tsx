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
import { HardHat, Lock, Mail, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { app } = useLocale()
  const redirectParam = searchParams.get('redirect')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
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
    <div className="min-h-screen flex">
      {/* Hero panel — desktop only */}
      <div className="hidden lg:flex lg:w-[52%] industrial-gradient relative overflow-hidden">
        <div className="absolute inset-0 site-grid-bg opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur border border-white/20">
              <HardHat className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-xl tracking-tight">SitePilot</p>
              <p className="text-xs uppercase tracking-widest text-white/60">Construction Operations</p>
            </div>
          </div>

          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Built for the field.<br />
              <span className="text-amber-400">Trusted on site.</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed">
              Professional site management for managers, supervisors, HSE teams, and field crews.
            </p>
            <div className="flex gap-6 pt-2">
              {[
                { value: '24/7', label: 'Site access' },
                { value: '100+', label: 'Team roles' },
                { value: 'Real-time', label: 'Reporting' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-amber-400">{stat.value}</p>
                  <p className="text-xs text-white/50 uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/40">© SitePilot · Smart Vision Construction Management</p>
        </div>
      </div>

      {/* Sign-in form */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-[420px] space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HardHat className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-lg">SitePilot</p>
              <p className="text-xs text-muted-foreground">Construction Operations</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">{app.signIn}</h2>
            <p className="text-muted-foreground text-sm">
              Enter your credentials to access the site operations platform.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {app.email}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-11"
                  placeholder="name@company.com"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  {app.password}
                </Label>
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

            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  {app.signIn}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Access is by invitation only. Contact your site administrator for credentials.
          </p>
        </div>
      </div>
    </div>
  )
}
