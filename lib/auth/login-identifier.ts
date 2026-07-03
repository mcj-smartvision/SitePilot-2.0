/** Internal domain for username-only logins (Supabase Auth requires an email). */
export const LOGIN_EMAIL_DOMAIN = 'site.local'

/** Convert username or email to Supabase auth email. Plain "sahar" → sahar@site.local */
export function normalizeLoginIdentifier(input: string): string {
  const value = input.trim().toLowerCase()
  if (!value) return value
  if (value.includes('@')) return value
  return `${value}@${LOGIN_EMAIL_DOMAIN}`
}

/** Show sahar@site.local as sahar in admin UI */
export function formatLoginDisplay(email: string): string {
  const value = email.trim().toLowerCase()
  const suffix = `@${LOGIN_EMAIL_DOMAIN}`
  if (value.endsWith(suffix)) {
    return value.slice(0, -suffix.length)
  }
  return email
}

export function isPlainUsername(input: string): boolean {
  return input.trim().length > 0 && !input.includes('@')
}
