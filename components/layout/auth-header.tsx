'use client'

import Link from 'next/link'
import { HeaderLanguageSwitcher } from '@/components/i18n/header-language-switcher'

/** Minimal auth pages header with global language switcher */
export function AuthHeader() {
  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/login" className="font-bold text-lg">
          SitePilot
        </Link>
        <HeaderLanguageSwitcher />
      </div>
    </header>
  )
}
