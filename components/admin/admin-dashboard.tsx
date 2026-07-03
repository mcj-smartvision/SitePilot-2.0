'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchAdminStats, fetchAllMembers } from '@/utils/admin'
import { PageHeader, LoadingBlock, ErrorBlock } from '@/components/admin/shared'
import { StatCard } from '@/components/admin/stat-card'
import { ActivityFeed } from '@/components/admin/activity-feed'
import { OnlineUsersPanel } from '@/components/admin/online-users-panel'
import { SupportTicketsPanel, CriticalAlertsPanel } from '@/components/admin/support-tickets'
import { RoleDashboardGrid } from '@/components/admin/role-dashboard-grid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getDemoActivities,
  getDemoOnlineUsers,
  getDemoSupportTickets,
  getDemoCriticalAlerts,
} from '@/lib/admin/demo-data'
import type { AdminStats, ProjectMember } from '@/types/admin'
import {
  Users,
  UserCheck,
  Wifi,
  AlertCircle,
  Ticket,
  Shield,
  UserPlus,
  FolderKanban,
} from 'lucide-react'

export function AdminDashboard() {
  const supabase = useSupabase()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const [statsData, memberData] = await Promise.all([
          fetchAdminStats(supabase),
          fetchAllMembers(supabase),
        ])
        if (!cancelled) {
          setStats(statsData)
          setMembers(memberData)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  if (loading) return <LoadingBlock label="Loading control center..." />
  if (error || !stats) return <ErrorBlock message={error ?? 'Unable to load dashboard'} />

  const activities = getDemoActivities()
  const onlineUsers = getDemoOnlineUsers()
  const tickets = getDemoSupportTickets()
  const alerts = getDemoCriticalAlerts()
  const pendingPassword = members.filter((m) => !m.password_changed_by_member).length
  const activeMembers = members.filter((m) => m.is_active).length

  return (
    <div className="space-y-8 max-w-[1600px]">
      <PageHeader
        title="Control Center"
        description="System overview, team monitoring, and operational intelligence for your construction site."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/projects">Projects</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/members">
                <UserPlus className="h-4 w-4 mr-1.5" />
                Add Member
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <StatCard label="Total Users" value={stats.memberCount} icon={Users} trend={`${stats.projectCount} projects`} />
        <StatCard label="Active Users" value={activeMembers} icon={UserCheck} trend="Currently enabled" trendType="up" />
        <StatCard label="Online Now" value={onlineUsers.filter((u) => u.status === 'online').length} icon={Wifi} trend="Live monitoring" trendType="up" />
        <StatCard label="Pending Issues" value={tickets.filter((t) => t.status === 'open').length} icon={AlertCircle} trend="Requires attention" trendType="warning" />
        <StatCard label="Support Tickets" value={tickets.length} icon={Ticket} trend={`${tickets.filter((t) => t.status === 'in_progress').length} in progress`} />
        <StatCard label="Password Pending" value={pendingPassword} icon={Shield} trend="First login required" trendType={pendingPassword > 0 ? 'warning' : 'neutral'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2 shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
              <Badge variant="outline" className="text-xs">Live feed</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ActivityFeed activities={activities} />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Online Users</CardTitle>
          </CardHeader>
          <CardContent>
            <OnlineUsersPanel users={onlineUsers} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Support & Messages</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7">View all</Button>
            </div>
          </CardHeader>
          <CardContent>
            <SupportTicketsPanel tickets={tickets} />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <CriticalAlertsPanel alerts={alerts} />
          </CardContent>
        </Card>
      </div>

      {stats.roleBreakdown && stats.roleBreakdown.length > 0 ? (
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Access by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.roleBreakdown.map((item) => (
                <div key={item.role} className="rounded-lg border bg-muted/30 px-4 py-3 min-w-[140px]">
                  <p className="text-xs text-muted-foreground">{item.role}</p>
                  <p className="text-2xl font-bold mt-0.5">{item.count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Role Dashboard Previews</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monitor what each site role sees — detect bottlenecks without switching accounts.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/members">
              <FolderKanban className="h-4 w-4 mr-1.5" />
              Manage Members
            </Link>
          </Button>
        </div>
        <RoleDashboardGrid />
      </div>
    </div>
  )
}
