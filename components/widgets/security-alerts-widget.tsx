'use client'

import { useEffect, useState } from 'react'
import type { WidgetRenderContext } from '@/types/dashboard'
import { WidgetShell } from '@/components/widgets/widget-shell'
import type { AttendanceDashboardSnapshot } from '@/lib/attendance/types'

export function SecurityAlertsWidget({ context }: { context: WidgetRenderContext }) {
  const [failed, setFailed] = useState<AttendanceDashboardSnapshot['failedTransits']>([])
  const [insideCount, setInsideCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!context.projectId) {
      setFailed([])
      setInsideCount(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/attendance/dashboard?projectId=${encodeURIComponent(context.projectId)}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load')
        const snap = json.snapshot as AttendanceDashboardSnapshot
        if (!cancelled) {
          setFailed(snap.failedTransits)
          setInsideCount(snap.kpis.insideCount)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [context.projectId])

  return (
    <WidgetShell title="Security Alerts" description="Failed IDs and live presence">
      {!context.projectId ? (
        <p className="text-sm text-muted-foreground">No project selected.</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            Currently on site:{' '}
            <span className="font-semibold">{insideCount ?? 0}</span>
          </p>
          {failed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No failed identifications today.</p>
          ) : (
            <ul className="space-y-2">
              {failed.slice(0, 6).map((alert) => (
                <li key={alert.id} className="rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {alert.identificationStatus === 'unauthorized'
                        ? 'Unauthorized'
                        : 'ID failed'}
                      {alert.personName ? ` — ${alert.personName}` : ''}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(alert.occurredAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </WidgetShell>
  )
}
