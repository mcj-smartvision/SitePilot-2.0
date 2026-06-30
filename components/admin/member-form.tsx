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
  onSubmit: (values: CreateMemberInput) => Promise<void>
  showPasswordField?: boolean
}

export function MemberForm({
  positions,
  initial,
  submitLabel,
  onSubmit,
  showPasswordField = !initial,
}: MemberFormProps) {
  const activePositions = positions.filter((p) => p.is_active)
  const [fullName, setFullName] = useState(initial?.full_name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [positionIds, setPositionIds] = useState<string[]>(
    initial?.position_ids ?? initial?.positions?.map((p) => p.id) ?? []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (positionIds.length < 1) {
      setError('Select at least one position.')
      return
    }

    if (showPasswordField && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: showPasswordField ? password : (initial?.admin_visible_password ?? ''),
        is_active: isActive,
        position_ids: positionIds,
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
              <Label htmlFor="member-email">Email (login username)</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={Boolean(initial)}
              />
            </div>
          </div>
          {showPasswordField ? (
            <div className="space-y-2">
              <Label htmlFor="member-password">Password</Label>
              <Input
                id="member-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Set login password for this member"
              />
              <p className="text-xs text-muted-foreground">
                Admin can view this password. Member can change it later in Settings.
              </p>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="member-phone">Phone</Label>
            <Input id="member-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Positions</Label>
            <p className="text-xs text-muted-foreground">
              Select one or more positions. Minimum 1, maximum all available positions.
            </p>
            <PositionMultiSelect
              positions={activePositions}
              selectedIds={positionIds}
              onChange={setPositionIds}
            />
          </div>
          <Checkbox
            id="member-active"
            label="Active member"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={loading || activePositions.length === 0}>
            {loading ? 'Saving...' : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
