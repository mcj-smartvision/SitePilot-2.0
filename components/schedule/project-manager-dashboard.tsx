'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, EmptyState } from '@/components/admin/shared'
import { ScheduleDateToolbar } from '@/components/schedule/schedule-date-toolbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DashboardUserContext } from '@/types/dashboard'
import type { ProjectAlert, ProjectScheduleSummary, SiteDailyReport } from '@/types/schedule'
import { approveDailyReport } from '@/utils/schedule'
import { AlertTriangle, BarChart3, FileText, ShieldAlert } from 'lucide-react'

interface ProjectManagerDashboardProps {
  initialContext: DashboardUserContext
  projectOptions: { id: string; name: string }[]
  initialProjectId: string | null
  initialSummary: ProjectScheduleSummary
  initialReports: SiteDailyReport[]
  initialAlerts: ProjectAlert[]
}

function severityVariant(severity: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (severity === 'critical') return 'destructive'
  if (severity === 'warning') return 'secondary'
  return 'outline'
}

export function ProjectManagerDashboard({
  initialContext,
  projectOptions,
  initialProjectId,
  initialSummary,
  initialReports,
  initialAlerts,
}: ProjectManagerDashboardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [projectId] = useState(initialProjectId ?? '')
  const [reports, setReports] = useState(initialReports)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleApprove(reportId: string) {
    setLoadingId(reportId)
    setError(null)
    try {
      const updated = await approveDailyReport(supabase, reportId, initialContext.userId)
      setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed')
    } finally {
      setLoadingId(null)
    }
  }

  if (projectOptions.length === 0) {
    return (
      <EmptyState
        title="No project assigned"
        description="Ask the admin to add you as Project Manager on a project."
      />
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Project Manager"
        description="Monitor progress, delays, alerts, and approve daily supervisor reports."
      />

      <ScheduleDateToolbar />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{initialSummary.overallPercentComplete}%</p>
            <p className="text-xs text-muted-foreground">Overall progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{initialSummary.delayedTasks}</p>
            <p className="text-xs text-muted-foreground">Delayed tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{initialSummary.criticalTasks}</p>
            <p className="text-xs text-muted-foreground">Critical path tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{initialSummary.unresolvedAlerts}</p>
            <p className="text-xs text-muted-foreground">Open alerts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Critical alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {initialAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open alerts.</p>
            ) : (
              initialAlerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
                    <span className="text-xs text-muted-foreground">{alert.alert_type}</span>
                  </div>
                  <p className="text-sm">{alert.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Schedule summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-sm space-y-2">
            <p>Total tasks: {initialSummary.totalTasks}</p>
            <p>Completed: {initialSummary.completedTasks}</p>
            <p>Delayed: {initialSummary.delayedTasks}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Daily reports — review & approve
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {error ? (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </p>
          ) : null}
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No daily reports yet.</p>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{report.report_date}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{report.raw_text}</p>
                  </div>
                  {report.approved_by_manager ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Approved</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(report.id)}
                      disabled={loadingId === report.id}
                    >
                      {loadingId === report.id ? 'Approving...' : 'Approve'}
                    </Button>
                  )}
                </div>
                {report.ai_parsed?.summary ? (
                  <p className="text-xs bg-muted rounded-md p-2">
                    <span className="font-medium">AI summary:</span> {report.ai_parsed.summary}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
