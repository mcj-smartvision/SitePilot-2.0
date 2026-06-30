'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchPositions, fetchProjectMembers } from '@/utils/admin'
import { PageHeader, LoadingBlock, ErrorBlock, StatusBadge, EmptyState } from '@/components/admin/shared'
import { MemberForm } from '@/components/admin/member-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Position, ProjectMember } from '@/types/admin'

export default function ProjectMembersPage({ params }: { params: { projectId: string } }) {
  const supabase = useSupabase()
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    const [memberData, positionData] = await Promise.all([
      fetchProjectMembers(supabase, params.projectId),
      fetchPositions(supabase, params.projectId),
    ])
    setMembers(memberData)
    setPositions(positionData)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        await loadData()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load members')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, params.projectId])

  async function handleCreateMember(values: {
    full_name: string
    email: string
    phone?: string
    is_active?: boolean
    position_ids: string[]
    send_invite?: boolean
  }) {
    const response = await fetch('/api/admin/invite-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: params.projectId,
        ...values,
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to create member')
    await loadData()
  }

  if (loading) return <LoadingBlock label="Loading members..." />
  if (error) return <ErrorBlock message={error} onRetry={() => window.location.reload()} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Members"
        description="Create members, assign multiple positions, and manage active status."
      />

      <MemberForm positions={positions} submitLabel="Add member" onSubmit={handleCreateMember} />

      {members.length === 0 ? (
        <EmptyState
          title="No members yet"
          description="Add your first project member and assign one or more positions."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Member directory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.full_name}</p>
                      <StatusBadge active={member.is_active} />
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <p className="text-sm">
                      <span className="font-medium">Password:</span>{' '}
                      {member.admin_visible_password || '—'}
                      {member.password_changed_by_member ? ' (changed by member)' : ''}
                    </p>
                    {member.phone ? <p className="text-sm text-muted-foreground">{member.phone}</p> : null}
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/projects/${params.projectId}/members/${member.id}`}>Edit profile</Link>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(member.positions ?? []).length === 0 ? (
                    <span className="text-xs text-muted-foreground">No positions assigned</span>
                  ) : (
                    member.positions?.map((position) => (
                      <span key={position.id} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                        {position.title}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
