'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/hooks/useSupabase'
import {
  fetchAdminProjects,
  fetchAllMembers,
  fetchPositions,
} from '@/utils/admin'
import { PageHeader, LoadingBlock, ErrorBlock, StatusBadge } from '@/components/admin/shared'
import { MemberForm } from '@/components/admin/member-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AdminProject, Position, ProjectMember } from '@/types/admin'
import { KeyRound, Pencil, ShieldAlert, UserCheck, Users } from 'lucide-react'

export default function AdminMembersPage() {
  const supabase = useSupabase()
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [projects, setProjects] = useState<AdminProject[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData(projectId?: string) {
    const [memberData, projectData] = await Promise.all([
      fetchAllMembers(supabase),
      fetchAdminProjects(supabase),
    ])
    setMembers(memberData)
    setProjects(projectData)

    const pid = projectId ?? selectedProjectId ?? projectData[0]?.id ?? ''
    if (pid && pid !== selectedProjectId) setSelectedProjectId(pid)

    if (pid) {
      const positionData = await fetchPositions(supabase, pid)
      setPositions(positionData)
    }
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
  }, [supabase])

  useEffect(() => {
    if (!selectedProjectId) return
    fetchPositions(supabase, selectedProjectId).then(setPositions).catch(console.error)
  }, [selectedProjectId, supabase])

  async function handleCreateMember(values: {
    full_name: string
    email: string
    phone?: string
    password: string
    is_active?: boolean
    position_ids: string[]
  }) {
    if (!selectedProjectId) throw new Error('Select a project first')

    const response = await fetch('/api/admin/invite-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: selectedProjectId,
        ...values,
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to create member')
    await loadData(selectedProjectId)
    setShowForm(false)
  }

  if (loading) return <LoadingBlock label="Loading members..." />
  if (error) return <ErrorBlock message={error} onRetry={() => window.location.reload()} />

  const activeCount = members.filter((m) => m.is_active).length
  const pendingPassword = members.filter((m) => !m.password_changed_by_member).length

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        title="Member Management"
        description="Add, edit, and monitor all site team members across projects."
        actions={
          <Button onClick={() => setShowForm(!showForm)} disabled={!selectedProjectId && projects.length === 0}>
            {showForm ? 'Cancel' : 'Add Member'}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{members.length}</p>
              <p className="text-xs text-muted-foreground">Total members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active members</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingPassword}</p>
              <p className="text-xs text-muted-foreground">Password change pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {projects.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">Project:</span>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">Create a project first to add members.</p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/admin/projects">Create Project</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm && selectedProjectId ? (
        <MemberForm
          positions={positions}
          submitLabel="Add Member"
          onSubmit={handleCreateMember}
        />
      ) : null}

      <Card className="shadow-card overflow-hidden">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="text-base font-semibold">Team Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No members yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Name</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Role</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Email / Username</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Password</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">First Login</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-medium">{member.full_name}</p>
                        {member.phone ? <p className="text-xs text-muted-foreground">{member.phone}</p> : null}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(member.positions ?? []).map((pos) => (
                            <Badge key={pos.id} variant="outline" className="text-xs font-normal">
                              {pos.title}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs">{member.email}</td>
                      <td className="px-4 py-3.5">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {member.admin_visible_password || '—'}
                        </code>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge active={member.is_active} />
                      </td>
                      <td className="px-4 py-3.5">
                        {member.password_changed_by_member ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <UserCheck className="h-3.5 w-3.5" /> Changed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <ShieldAlert className="h-3.5 w-3.5" /> Required
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/projects/${member.project_id}/members/${member.id}`}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
