'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '@/components/i18n/locale-provider'
import { getSiteOpsMessages } from '@/lib/i18n/site-ops'
import { createClient } from '@/lib/supabase/client'

export function SiteOpsShell({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale()
  const t = getSiteOpsMessages(locale)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId') ?? ''
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    const supabase = createClient()
    void supabase
      .from('projects')
      .select('id, name')
      .order('name')
      .then(({ data }) => setProjects(data ?? []))
  }, [])

  useEffect(() => {
    if (!projectId && projects[0]) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('projectId', projects[0].id)
      router.replace(`${pathname}?${params.toString()}`)
    }
  }, [projectId, projects, pathname, router, searchParams])

  const links = useMemo(
    () => [
      { href: '/site-ops', label: t.overview },
      { href: '/site-ops/cre-runs', label: t.creRuns },
      { href: '/site-ops/daily-plans', label: t.dailyPlans },
      { href: '/site-ops/reports/daily', label: t.dailyReport },
    ],
    [t]
  )

  function onProjectChange(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('projectId', id)
    router.push(`${pathname}?${params.toString()}`)
  }

  const q = projectId ? `?projectId=${projectId}` : ''

  return (
    <div className="space-y-6" dir={locale === 'fa' || locale === 'ar' ? 'rtl' : 'ltr'}>
      <header className="space-y-2 border-b border-slate-200 pb-4">
        <p className="text-sm font-medium text-slate-500">{t.brand}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t.tagline}</h1>
        <p className="max-w-3xl text-sm text-slate-600">{t.subtitle}</p>
        <div className="flex flex-wrap items-end gap-3 pt-2">
          <label className="text-sm text-slate-600">
            {t.project}
            <select
              className="mt-1 block min-w-[220px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={projectId}
              onChange={(e) => onProjectChange(e.target.value)}
            >
              <option value="">{t.selectProject}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <nav className="flex flex-wrap gap-2">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={`${link.href}${q}`}
                  className={`rounded-md px-3 py-1.5 text-sm ${
                    active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
