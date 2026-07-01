import type { FormLocale } from '@/lib/project-init/i18n/types'
import { normalizeLocale } from '@/lib/project-init/i18n/utils'

export const LOCALE_COOKIE = 'sitepilot_locale'

export function readLocaleCookie(): FormLocale {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`))
  return normalizeLocale(match?.[1] ? decodeURIComponent(match[1]) : undefined)
}

export function writeLocaleCookie(locale: FormLocale) {
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)};path=/;max-age=${maxAge};SameSite=Lax`
}
