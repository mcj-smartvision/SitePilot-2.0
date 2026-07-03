'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchDashboardStats } from '@/utils/dashboard'
import type { WidgetRenderContext } from '@/types/dashboard'
import { WidgetShell } from '@/components/widgets/widget-shell'
import { Skeleton } from '@/components/ui/skeleton'

export function OverviewStatsWidget({ context }: { context: WidgetRenderContext }) {
  const supabase = useSupabase()
  const [stats, setStats] = useState<{ reportCount: number; memberCount: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!context.projectId) {
      setLoading(false)
      return
    }
    fetchDashboardStats(supabase, context.projectId)
      .then((data) => setStats(data))
      .finally(() => setLoading(false))
  }, [context.projectId, supabase])

  return (
    <WidgetShell title="Daily Summary" description="Project snapshot at a glance">
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : !context.projectId ? (
        <p className="text-sm text-muted-foreground">No active project assigned.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Reports" value={String(stats?.reportCount ?? 0)} />
          <Stat label="Team members" value={String(stats?.memberCount ?? 0)} />
          <Stat label="Role" value={context.user.primaryRole?.replace(/_/g, ' ') ?? 'Member'} />
          <Stat label="Status" value="Active" />
        </div>
      )}
      <Link href="/reports" className="text-xs text-primary underline mt-4 inline-block">
        View all reports
      </Link>
    </WidgetShell>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold capitalize">{value}</p>
    </div>
  )
}
