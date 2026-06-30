import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SitePilot 2.0',
  description: 'Construction Site Monitoring System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  )
}
