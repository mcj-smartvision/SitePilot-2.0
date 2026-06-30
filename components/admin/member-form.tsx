'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PositionMultiSelect } from '@/components/admin/position-multi-select'
import type { CreateMemberInput, Position, ProjectMember } from '@/types/admin'

interface MemberFormProps {
  positions: Position[]
  initial?: Partial<ProjectMember> & { position_ids?: string[] }
  submitLabel: string
  onSubmit: (values: CreateMemberInput & { send_invite?: boolean }) => Promise<void>
}

export function MemberForm({ positions, initial, submitLabel, onSubmit }: MemberFormProps) {
  const [fullName, setFullName] = useState(initial?.full_name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [sendInvite, setSendInvite] = useState(!initial)
  const [positionIds, setPositionIds] = useState<string[]>(
    initial?.position_ids ?? initial?.positions?.map((p) => p.id) ?? []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await onSubmit({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        is_active: isActive,
        position_ids: positionIds,
        send_invite: sendInvite,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{submitLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="member-name">Full name</Label>
              <Input id="member-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input id="member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-phone">Phone</Label>
            <Input id="member-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Positions</Label>
            <PositionMultiSelect positions={positions.filter((p) => p.is_active)} selectedIds={positionIds} onChange={setPositionIds} />
          </div>
          <div className="flex flex-col gap-2">
            <Checkbox id="member-active" label="Active member" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            {!initial ? (
              <Checkbox
                id="member-invite"
                label="Send invite email if account does not exist"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
              />
            ) : null}
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : submitLabel}</Button>
        </form>
      </CardContent>
    </Card>
  )
}
