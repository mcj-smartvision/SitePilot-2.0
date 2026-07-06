'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/components/i18n/locale-provider'
import { PageHeader, EmptyState, LoadingBlock, ErrorBlock, SectionCard } from '@/components/admin/shared'
import { ScheduleDateToolbar } from '@/components/schedule/schedule-date-toolbar'
import { AiDraftViewer } from '@/components/shared/ai-draft-viewer'
import { ModalOverlay } from '@/components/shared/modal-overlay'
import { PmKpiCards, ProjectHealthPanel } from '@/components/project-manager/pm-panels'
import { ApprovalCenter, DepartmentOverviewGrid, ActivityFeedPanel } from '@/components/project-manager/pm-sections'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSupabase } from '@/hooks/useSupabase'
import { getProjectManagerMessages, pmAiLabels } from '@/lib/i18n/project-manager'
import type { ApprovalItem, ProjectManagerDashboardData } from '@/lib/project-manager/types'
import { writeProjectCookie } from '@/lib/project/project-cookie'
import type { DashboardUserContext } from '@/types/dashboard'
import type { ProjectAlert, ProjectScheduleSummary, SiteDailyReport } from '@/types/schedule'
import { approveDailyReport } from '@/utils/schedule'
import {
  approvePmAiAction,
  loadProjectManagerDashboard,
  rejectPmAiAction,
} from '@/utils/project-manager/dashboard'
import { cn } from '@/lib/utils'
import { ShieldAlert } from 'lucide-react'

interface ProjectManagerDashboardProps {
  initialContext: DashboardUserContext
  projectOptions: { id: string; name: string }[]
  initialProjectId: string | null
  initialSummary: ProjectScheduleSummary
  initialReports: SiteDailyReport[]
  initialAlerts: ProjectAlert[]
}

export function ProjectManagerDashboard({
  initialContext,
  projectOptions,
  initialProjectId,
  initialSummary,
  initialReports,
  initialAlerts,
}: ProjectManagerDashboardProps) {
  const supabase = useSupabase()
  const router = useRouter()
  const { locale, dir } = useLocale()
  const t = getProjectManagerMessages(locale)
  const aiLabels = pmAiLabels(t)
  const isRtl = dir === 'rtl'

  const [projectId, setProjectId] = useState<string | null>(initialProjectId)
  const [data, setData] = useState<ProjectManagerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ApprovalItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!projectId) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await loadProjectManagerDashboard(
        supabase,
        projectId,
        initialSummary,
        initialReports,
        initialAlerts
      )
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError)
    } finally {
      setLoading(false)
    }
  }, [projectId, supabase, initialSummary, initialReports, initialAlerts, t.loadError])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function handleProjectChange(id: string) {
    setProjectId(id)
    writeProjectCookie(id)
  }

  async function handleApproveItem(item: ApprovalItem, editedText: string) {
    setActionLoading(true)
    setLoadingId(item.id)
    try {
      if (item.kind === 'ai_action') {
        await approvePmAiAction(supabase, item.id, initialContext.userId, editedText)
      } else {
        await approveDailyReport(supabase, item.id, initialContext.userId)
      }
      setSelected(null)
      router.refresh()
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError)
    } finally {
      setActionLoading(false)
      setLoadingId(null)
    }
  }

  async function handleRejectItem(item: ApprovalItem) {
    setActionLoading(true)
    setLoadingId(item.id)
    try {
      if (item.kind === 'ai_action') {
        await rejectPmAiAction(supabase, item.id, initialContext.userId, rejectReason || undefined)
      }
      setSelected(null)
      setRejectReason('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError)
    } finally {
      setActionLoading(false)
      setLoadingId(null)
    }
  }

  if (projectOptions.length === 0) {
    return (
      <EmptyState
        title={t.title}
        description="Ask the admin to add you as Project Manager on a project."
      />
    )
  }

  const health = data?.health ?? {
    plannedProgress: initialSummary.overallPercentComplete,
    actualProgress: initialSummary.overallPercentComplete,
    scheduleDelayDays: initialSummary.delayedTasks > 0 ? 1 : 0,
    criticalDelayedActivities: initialSummary.criticalTasks,
    pendingApprovals: 0,
    shortageMaterials: 0,
    shortageManpower: 0,
    activeQcIssues: 0,
    activeHseAlerts: initialAlerts.length,
    riskLevel: 'medium' as const,
  }

  return (
    <div className={cn('space-y-8', isRtl && 'text-right')}>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          projectOptions.length > 1 ? (
            <Select value={projectId ?? undefined} onValueChange={handleProjectChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={t.selectProject} />
              </SelectTrigger>
              <SelectContent>
                {projectOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />

      <ScheduleDateToolbar />

      {loading && !data ? <LoadingBlock label={t.saving} /> : null}
      {error ? <ErrorBlock message={error} onRetry={() => void loadData()} /> : null}

      <PmKpiCards health={health} t={t} />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <ProjectHealthPanel health={health} t={t} />
          <ApprovalCenter
            items={data?.approvals ?? []}
            t={t}
            isRtl={isRtl}
            loadingId={loadingId}
            onView={setSelected}
          />
        </div>
        <div className="space-y-6">
          <SectionCard title={t.criticalAlerts}>
            {initialAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t.noAlerts}</p>
            ) : (
              <div className="space-y-2 p-4">
                {initialAlerts.slice(0, 6).map((alert) => (
                  <div key={alert.id} className="rounded-lg border p-3 text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p>{alert.message}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
          <ActivityFeedPanel items={data?.activity ?? []} t={t} />
        </div>
      </div>

      <DepartmentOverviewGrid departments={data?.departments ?? []} t={t} />

      <ModalOverlay open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? t.approvalCenter}>
        {selected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{selected.description}</p>
            <AiDraftViewer
              text={selected.aiGeneratedText ?? selected.description}
              status="confirmed_by_user"
              labels={aiLabels}
              forceShowActions
              loading={actionLoading}
              onApprove={(text) => handleApproveItem(selected, text)}
              onReject={() => handleRejectItem(selected)}
            />
            {selected.kind === 'ai_action' ? (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">{t.rejectionReason}</label>
                <Textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1"
                disabled={actionLoading}
                onClick={() => void handleApproveItem(selected, selected.aiGeneratedText ?? selected.description)}
              >
                {actionLoading ? t.approving : t.approve}
              </Button>
              {selected.kind === 'ai_action' ? (
                <Button type="button" variant="outline" disabled={actionLoading} onClick={() => void handleRejectItem(selected)}>
                  {t.reject}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </ModalOverlay>
    </div>
  )
}
