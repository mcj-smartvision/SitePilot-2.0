import { Suspense } from 'react'
import { SiteOpsShell } from '@/components/site-ops/site-ops-shell'

export default function SiteOpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading Site Ops…</div>}>
      <SiteOpsShell>{children}</SiteOpsShell>
    </Suspense>
  )
}
