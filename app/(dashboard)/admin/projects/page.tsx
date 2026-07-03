'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { createProject, fetchAdminProjects } from '@/utils/admin'
import { PageHeader, LoadingBlock, ErrorBlock, StatusBadge } from '@/components/admin/shared'
import { ProjectForm } from '@/components/admin/project-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { AdminProject, CreateProjectInput } from '@/types/admin'

export default function AdminProjectsPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const [projects, setProjects] = useState<AdminProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadProjects() {
    const data = await fetchAdminProjects(supabase)
    setProjects(data)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        await loadProjects()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load projects')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  async function handleCreate(input: CreateProjectInput) {
    const project = await createProject(supabase, input)
    await loadProjects()
    router.push(`/admin/projects/${project.id}/members`)
  }

  if (loading) return <LoadingBlock label="Loading projects..." />
  if (error) return <ErrorBlock message={error} onRetry={() => window.location.reload()} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Create and manage construction projects. Each project has its own members, positions, and configuration."
        actions={
          <Button asChild>
            <Link href="/admin/projects/initialize">Initialize New Project</Link>
          </Button>
        }
      />

      <ProjectForm submitLabel="Quick create project" onSubmit={handleCreate} />

      <Card>
        <CardHeader>
          <CardTitle>All projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects created yet.</p>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{project.name}</p>
                    <StatusBadge active={project.is_active} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {project.code ? `${project.code} · ` : ''}{project.status}
                    {project.location ? ` · ${project.location}` : ''}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/projects/${project.id}/members`}>Manage</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
