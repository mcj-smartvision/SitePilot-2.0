'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ConstructionRoleSelect } from '@/components/admin/construction-role-select'
import { normalizeLoginIdentifier } from '@/lib/auth/login-identifier'
import type { CreateMemberInput, Position, ProjectMember } from '@/types/admin'
import { UserPlus } from 'lucide-react'

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
  const [fullName, setFullName] = useState(initial?.full_name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [roleId, setRoleId] = useState<string>(
    initial?.position_ids?.[0] ?? initial?.positions?.[0]?.id ?? ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!roleId) {
      setError('Select a site role.')
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
        email: normalizeLoginIdentifier(email.trim()),
        phone: phone.trim() || undefined,
        password: showPasswordField ? password : (initial?.admin_visible_password ?? ''),
        is_active: isActive,
        position_ids: [roleId],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-card border-primary/20">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserPlus className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">{submitLabel}</CardTitle>
            <CardDescription>Add a new team member with role and login credentials.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="member-name">Full Name</Label>
              <Input
                id="member-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-11"
                placeholder="Ahmad Rezaei"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-email">Username</Label>
              <Input
                id="member-email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={Boolean(initial)}
                className="h-11"
                placeholder="sahar"
              />
              <p className="text-xs text-muted-foreground">
                Plain username only — no @ needed. Example: sahar
              </p>
            </div>
          </div>

          <ConstructionRoleSelect
            positions={positions}
            value={roleId}
            onChange={setRoleId}
          />

          {showPasswordField ? (
            <div className="space-y-2">
              <Label htmlFor="member-password">Initial Password</Label>
              <Input
                id="member-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 font-mono"
                placeholder="Set login password"
              />
              <p className="text-xs text-muted-foreground">
                Admin can view this password. Member must change it on first login.
              </p>
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="member-phone">Phone (optional)</Label>
              <Input
                id="member-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11"
                placeholder="+98 ..."
              />
            </div>
            <div className="flex items-end pb-1">
              <Checkbox
                id="member-active"
                label="Active member"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          ) : null}

          <Button type="submit" disabled={loading || positions.filter((p) => p.is_active).length === 0} className="h-11">
            {loading ? 'Saving...' : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
