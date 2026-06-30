'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchAdminProjects, fetchAdminStats } from '@/utils/admin'
import { PageHeader, LoadingBlock, ErrorBlock } from '@/components/admin/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { AdminProject, AdminStats } from '@/types/admin'

export default function AdminHomePage() {
  const supabase = useSupabase()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [projects, setProjects] = useState<AdminProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const [statsData, projectData] = await Promise.all([
          fetchAdminStats(supabase),
          fetchAdminProjects(supabase),
        ])
        if (!cancelled) {
          setStats(statsData)
          setProjects(projectData.slice(0, 5))
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load admin dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  if (loading) return <LoadingBlock label="Loading admin dashboard..." />
  if (error || !stats) return <ErrorBlock message={error ?? 'Unable to load dashboard'} />

  const cards = [
    { label: 'Projects', value: stats.projectCount },
    { label: 'Members', value: stats.memberCount },
    { label: 'Positions', value: stats.positionCount },
    { label: 'Active Routes', value: stats.activeRouteCount },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="Manage projects, members, positions, notification routing, and dashboard widgets."
        actions={<Button asChild><Link href="/admin/projects">Manage Projects</Link></Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet. Create your first project to get started.</p>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-muted-foreground">{project.code || project.status}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/projects/${project.id}/members`}>Open project</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
