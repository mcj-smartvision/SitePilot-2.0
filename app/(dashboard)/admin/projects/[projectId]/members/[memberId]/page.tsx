'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchPositions, fetchProjectMember, updateProjectMember } from '@/utils/admin'
import { PageHeader, LoadingBlock, ErrorBlock } from '@/components/admin/shared'
import { MemberForm } from '@/components/admin/member-form'
import { AdminPasswordPanel } from '@/components/admin/admin-password-panel'
import { Button } from '@/components/ui/button'
import type { CreateMemberInput, Position, ProjectMember } from '@/types/admin'

export default function MemberProfilePage({
  params,
}: {
  params: { projectId: string; memberId: string }
}) {
  const supabase = useSupabase()
  const router = useRouter()
  const [member, setMember] = useState<ProjectMember | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function loadMember() {
    const [memberData, positionData] = await Promise.all([
      fetchProjectMember(supabase, params.memberId),
      fetchPositions(supabase, params.projectId),
    ])
    if (!memberData) throw new Error('Member not found')
    setMember(memberData)
    setPositions(positionData)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        await loadMember()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load member profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, params.memberId, params.projectId])

  if (loading) return <LoadingBlock label="Loading member profile..." />
  if (error || !member) return <ErrorBlock message={error ?? 'Member not found'} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Member Profile"
        description="Update member details, positions, and login credentials."
        actions={
          <Button asChild variant="outline">
            <Link href={`/admin/projects/${params.projectId}/members`}>Back to members</Link>
          </Button>
        }
      />

      {saved ? (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          Member profile updated successfully.
        </p>
      ) : null}

      <AdminPasswordPanel
        member={member}
        onReset={async (password) => {
          const response = await fetch('/api/admin/reset-member-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ member_id: member.id, password }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Failed to reset password')
          await loadMember()
        }}
      />

      <MemberForm
        positions={positions}
        initial={{
          ...member,
          position_ids: member.positions?.map((position) => position.id) ?? [],
        }}
        submitLabel="Save changes"
        showPasswordField={false}
        onSubmit={async (values: CreateMemberInput) => {
          await updateProjectMember(supabase, member.id, {
            full_name: values.full_name,
            phone: values.phone,
            is_active: values.is_active,
            position_ids: values.position_ids,
          })
          setSaved(true)
          await loadMember()
          router.refresh()
        }}
      />
    </div>
  )
}
