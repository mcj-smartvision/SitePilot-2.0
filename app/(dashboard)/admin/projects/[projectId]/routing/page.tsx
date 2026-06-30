'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/hooks/useSupabase'
import {
  deleteNotificationRoute,
  fetchEventTypes,
  fetchNotificationRoutes,
  fetchPositions,
  upsertNotificationRoute,
} from '@/utils/admin'
import { PageHeader, LoadingBlock, ErrorBlock } from '@/components/admin/shared'
import { NotificationRouteEditor } from '@/components/admin/notification-route-editor'
import type { EventType, NotificationRoute, Position } from '@/types/admin'

export default function ProjectRoutingPage({ params }: { params: { projectId: string } }) {
  const supabase = useSupabase()
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [routes, setRoutes] = useState<NotificationRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    const [eventData, positionData, routeData] = await Promise.all([
      fetchEventTypes(supabase),
      fetchPositions(supabase, params.projectId),
      fetchNotificationRoutes(supabase, params.projectId),
    ])
    setEventTypes(eventData)
    setPositions(positionData.filter((position) => position.is_active))
    setRoutes(routeData)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        await loadData()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load routing')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, params.projectId])

  if (loading) return <LoadingBlock label="Loading notification routing..." />
  if (error) return <ErrorBlock message={error} onRetry={() => window.location.reload()} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Routing"
        description="Route event notifications to positions. Members receive the union of notifications from all assigned positions."
      />

      <NotificationRouteEditor
        eventTypes={eventTypes}
        positions={positions}
        routes={routes}
        onSave={async (payload) => {
          await upsertNotificationRoute(supabase, params.projectId, payload)
          await loadData()
        }}
        onDelete={async (routeId) => {
          await deleteNotificationRoute(supabase, routeId)
          await loadData()
        }}
      />
    </div>
  )
}
