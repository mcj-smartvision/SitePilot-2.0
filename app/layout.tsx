import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { LocaleProvider } from '@/components/i18n/locale-provider'
import { ScheduleCalendarProvider } from '@/components/schedule/schedule-calendar-provider'
import { LOCALE_COOKIE } from '@/lib/i18n/locale-cookie'
import { isRtlLocale, normalizeLocale } from '@/lib/project-init/i18n/utils'
import './globals.css'

export const metadata: Metadata = {
  title: 'Liparta',
  description: 'Control Readiness & Site Operations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const initialLocale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value)
  const dir = isRtlLocale(initialLocale) ? 'rtl' : 'ltr'

  return (
    <html lang={initialLocale} dir={dir} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <LocaleProvider initialLocale={initialLocale}>
          <ScheduleCalendarProvider>{children}</ScheduleCalendarProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}
