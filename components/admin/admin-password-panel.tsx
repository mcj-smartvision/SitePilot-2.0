'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProjectMember } from '@/types/admin'

interface AdminPasswordPanelProps {
  member: ProjectMember
  onReset: (password: string) => Promise<void>
}

export function AdminPasswordPanel({ member, onReset }: AdminPasswordPanelProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      await onReset(password)
      setMessage('Password updated successfully.')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login credentials (admin view)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/40 p-4 space-y-2">
          <p className="text-sm">
            <span className="font-medium">Username:</span> {member.email}
          </p>
          <p className="text-sm">
            <span className="font-medium">Current admin-visible password:</span>{' '}
            {member.admin_visible_password || '—'}
          </p>
          {member.password_changed_by_member ? (
            <p className="text-xs text-amber-700">
              This member changed their password in Settings. Admin sees the last password set by admin above.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Member has not changed the password yet.</p>
          )}
        </div>

        <form onSubmit={handleReset} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="reset-password">Set new password</Label>
            <Input
              id="reset-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              placeholder="New password for this member"
              required
            />
          </div>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
