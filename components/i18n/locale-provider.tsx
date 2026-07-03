'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { APP_SHELL } from '@/lib/i18n/app-shell'
import { LOCALE_COOKIE, readLocaleCookie, writeLocaleCookie } from '@/lib/i18n/locale-cookie'
import type { FormLocale } from '@/lib/project-init/i18n/types'
import { isRtlLocale, normalizeLocale } from '@/lib/project-init/i18n/utils'

interface LocaleContextValue {
  locale: FormLocale
  dir: 'ltr' | 'rtl'
  setLocale: (locale: FormLocale) => void
  app: (typeof APP_SHELL)[FormLocale]
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode
  initialLocale?: string
}) {
  const router = useRouter()
  const [locale, setLocaleState] = useState<FormLocale>(() =>
    normalizeLocale(initialLocale ?? (typeof window !== 'undefined' ? readLocaleCookie() : undefined))
  )

  const dir = isRtlLocale(locale) ? 'rtl' : 'ltr'

  const setLocale = useCallback(
    (next: FormLocale) => {
      setLocaleState(next)
      writeLocaleCookie(next)
      document.documentElement.lang = next
      document.documentElement.dir = isRtlLocale(next) ? 'rtl' : 'ltr'
      router.refresh()
    },
    [router]
  )

  useEffect(() => {
    const fromCookie = readLocaleCookie()
    if (fromCookie !== locale) {
      setLocaleState(fromCookie)
    }
    document.documentElement.lang = locale
    document.documentElement.dir = dir
  }, [locale, dir])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir,
      setLocale,
      app: APP_SHELL[locale],
    }),
    [locale, dir, setLocale]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return ctx
}

export function useLocaleSafe() {
  const ctx = useContext(LocaleContext)
  if (ctx) return ctx
  const locale: FormLocale = 'en'
  return {
    locale,
    dir: 'ltr' as const,
    setLocale: () => {},
    app: APP_SHELL[locale],
  }
}

export { LOCALE_COOKIE }
