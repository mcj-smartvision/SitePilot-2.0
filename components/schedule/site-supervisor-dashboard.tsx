'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageHeader, EmptyState, LoadingBlock } from '@/components/admin/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DashboardUserContext } from '@/types/dashboard'
import type { ProjectTask } from '@/types/schedule'
import { createDailyReport, requestDailyReportAiParse } from '@/utils/schedule'
import { CalendarDays, CheckCircle2, ClipboardList } from 'lucide-react'

interface SiteSupervisorDashboardProps {
  initialContext: DashboardUserContext
  projectOptions: { id: string; name: string }[]
  initialProjectId: string | null
  initialTasks: ProjectTask[]
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

export function SiteSupervisorDashboard({
  initialContext,
  projectOptions,
  initialProjectId,
  initialTasks,
}: SiteSupervisorDashboardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [projectId, setProjectId] = useState(initialProjectId ?? '')
  const [tasks] = useState(initialTasks)
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10))
  const [rawText, setRawText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!projectId) {
      setError('Select a project first.')
      return
    }
    if (!rawText.trim()) {
      setError('Write your daily report.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const report = await createDailyReport(supabase, initialContext.userId, {
        project_id: projectId,
        report_date: reportDate,
        raw_text: rawText,
      })

      try {
        await requestDailyReportAiParse(report.id)
      } catch {
        // AI parse is optional for now
      }

      setSuccess('Daily report saved.')
      setRawText('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save report')
    } finally {
      setLoading(false)
    }
  }

  if (projectOptions.length === 0) {
    return (
      <EmptyState
        title="No project assigned"
        description="Ask the project admin to add you to a project with Site Supervisor position."
      />
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Site Supervisor"
        description="Review this week's planned tasks and submit your daily site report."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Label className="text-sm font-medium">Project</Label>
        <Select value={projectId || undefined} onValueChange={setProjectId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {projectOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Tasks — today / this week
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No schedule tasks yet. Ask admin to import MSP XML under Admin → Projects → Schedule.
            </div>
          ) : (
            <div className="divide-y">
              {tasks.map((task) => (
                <div key={task.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(task.start_planned)} → {formatDate(task.finish_planned)}
                      {task.wbs_code ? ` · WBS ${task.wbs_code}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.is_critical ? <Badge variant="destructive">Critical</Badge> : null}
                    <Badge variant="outline">{task.percent_complete}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Daily report
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-date">Date</Label>
              <Input
                id="report-date"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="max-w-[200px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="raw-text">Site status & issues</Label>
              <Textarea
                id="raw-text"
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Describe today's progress, delays, equipment issues, material needs..."
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {success ? (
              <p className="text-sm text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </p>
            ) : null}
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Submit daily report'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
