'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchDashboardWidgets,
  fetchPositionWidgets,
  fetchPositions,
  upsertWidgetVisibility,
} from '@/utils/admin'
import { PageHeader, LoadingBlock, ErrorBlock } from '@/components/admin/shared'
import { WidgetVisibilityEditor } from '@/components/admin/widget-visibility-editor'
import type { DashboardWidget, Position, PositionDashboardWidget } from '@/types/admin'

export default function ProjectWidgetsPage({ params }: { params: { projectId: string } }) {
  const supabase = useSupabase()
  const [positions, setPositions] = useState<Position[]>([])
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [assignments, setAssignments] = useState<PositionDashboardWidget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    const [positionData, widgetData, assignmentData] = await Promise.all([
      fetchPositions(supabase, params.projectId),
      fetchDashboardWidgets(supabase),
      fetchPositionWidgets(supabase, params.projectId),
    ])
    setPositions(positionData.filter((position) => position.is_active))
    setWidgets(widgetData)
    setAssignments(assignmentData)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        await loadData()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load widgets')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, params.projectId])

  if (loading) return <LoadingBlock label="Loading widget visibility..." />
  if (error) return <ErrorBlock message={error} onRetry={() => window.location.reload()} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Widget Visibility"
        description="Configure which dashboard modules are visible for each position."
      />

      <WidgetVisibilityEditor
        positions={positions}
        widgets={widgets}
        assignments={assignments}
        onSave={async (payload) => {
          await upsertWidgetVisibility(supabase, payload)
          await loadData()
        }}
      />
    </div>
  )
}
