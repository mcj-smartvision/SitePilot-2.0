'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/hooks/useSupabase'
import { fetchAdminStats, fetchAllMembers } from '@/utils/admin'
import { PageHeader, LoadingBlock, ErrorBlock } from '@/components/admin/shared'
import { StatCard } from '@/components/admin/stat-card'
import { ActivityFeed } from '@/components/admin/activity-feed'
import { OnlineUsersPanel } from '@/components/admin/online-users-panel'
import { SupportTicketsPanel, CriticalAlertsPanel } from '@/components/admin/support-tickets'
import { RoleDashboardGrid } from '@/components/admin/role-dashboard-grid'
import { Button } from '@/components/ui/button'
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
import { APP_TAGLINE } from '@/lib/brand'

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

  const activities = getDemoActivities().slice(0, 5)
  const onlineUsers = getDemoOnlineUsers()
  const tickets = getDemoSupportTickets()
  const alerts = getDemoCriticalAlerts()
  const pendingPassword = members.filter((m) => !m.password_changed_by_member).length
  const activeMembers = members.filter((m) => m.is_active).length
  const onlineNow = onlineUsers.filter((u) => u.status === 'online').length
  const openTickets = tickets.filter((t) => t.status === 'open').length

  return (
    <div className="mx-auto max-w-[1280px] space-y-10">
      <PageHeader
        title="Control Center"
        description={`${APP_TAGLINE} System overview and team monitoring — without the clutter.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-9 rounded-lg">
              <Link href="/admin/projects">Projects</Link>
            </Button>
            <Button asChild size="sm" className="h-9 rounded-lg">
              <Link href="/admin/members">
                <UserPlus className="h-4 w-4 me-1.5" />
                Add Member
              </Link>
            </Button>
          </div>
        }
      />

      {/* Primary metrics — room to breathe */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Users" value={stats.memberCount} icon={Users} trend={`${stats.projectCount} projects`} />
        <StatCard label="Active Users" value={activeMembers} icon={UserCheck} trend="Currently enabled" trendType="up" />
        <StatCard label="Online Now" value={onlineNow} icon={Wifi} trend="Live monitoring" trendType="up" />
        <StatCard
          label="Needs Attention"
          value={openTickets + pendingPassword}
          icon={AlertCircle}
          trend={pendingPassword > 0 ? `${pendingPassword} password pending` : 'All clear'}
          trendType={openTickets + pendingPassword > 0 ? 'warning' : 'up'}
        />
      </section>

      {/* Secondary strip — quieter, not competing */}
      <section className="grid gap-3 sm:grid-cols-3">
        <QuietMetric label="Support Tickets" value={tickets.length} hint={`${tickets.filter((t) => t.status === 'in_progress').length} in progress`} icon={Ticket} />
        <QuietMetric label="Open Issues" value={openTickets} hint="Requires attention" icon={AlertCircle} />
        <QuietMetric
          label="Password Pending"
          value={pendingPassword}
          hint="First login required"
          icon={Shield}
          warn={pendingPassword > 0}
        />
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Recent Activity" hint="Latest site actions">
          <ActivityFeed activities={activities} />
        </Panel>
        <Panel title="Online Users" hint={`${onlineNow} active now`}>
          <OnlineUsersPanel users={onlineUsers} />
        </Panel>
      </section>

      <section className="grid gap-8 xl:grid-cols-2">
        <Panel title="Support & Messages" action={<span className="text-xs text-muted-foreground">View all</span>}>
          <SupportTicketsPanel tickets={tickets} />
        </Panel>
        <Panel title="Critical Alerts">
          <CriticalAlertsPanel alerts={alerts} />
        </Panel>
      </section>

      {stats.roleBreakdown && stats.roleBreakdown.length > 0 ? (
        <Panel title="Access by Role" hint="Active memberships by position">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stats.roleBreakdown.map((item) => (
              <div key={item.role} className="rounded-xl bg-slate-50 px-4 py-4">
                <p className="text-xs text-muted-foreground">{item.role}</p>
                <p className="text-2xl font-semibold tracking-tight mt-1">{item.count}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <section className="space-y-5 pt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold tracking-tight">Role Dashboard Previews</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              See what each site role sees — without switching accounts.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="h-9 rounded-lg shrink-0">
            <Link href="/admin/members">
              <FolderKanban className="h-4 w-4 me-1.5" />
              Manage Members
            </Link>
          </Button>
        </div>
        <RoleDashboardGrid />
      </section>
    </div>
  )
}

function QuietMetric({
  label,
  value,
  hint,
  icon: Icon,
  warn,
}: {
  label: string
  value: number
  hint: string
  icon: typeof Ticket
  warn?: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/70 px-4 py-3">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          warn ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-lg font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{hint}</p>
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  hint,
  action,
  children,
}: {
  title: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          {hint ? <p className="text-xs text-muted-foreground mt-0.5">{hint}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
