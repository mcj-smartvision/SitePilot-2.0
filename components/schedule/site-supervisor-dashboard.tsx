'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bot, Loader2 } from 'lucide-react'
import { useLocale } from '@/components/i18n/locale-provider'
import { PageHeader, LoadingBlock, ErrorBlock, SectionCard, EmptyState } from '@/components/admin/shared'
import { ScheduleDateToolbar } from '@/components/schedule/schedule-date-toolbar'
import { SupervisorSummaryCards } from '@/components/supervisor/supervisor-summary-cards'
import { TodayActivitiesTable } from '@/components/supervisor/today-activities-table'
import { LookaheadPanel } from '@/components/supervisor/lookahead-panel'
import { ResourcesPanel } from '@/components/supervisor/resources-panel'
import { IssuesAlertsPanel } from '@/components/supervisor/issues-alerts-panel'
import { QuickReportDialog } from '@/components/supervisor/quick-report-dialog'
import { AiDraftViewer } from '@/components/shared/ai-draft-viewer'
import { ModalOverlay } from '@/components/supervisor/modal-overlay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useScheduleViewDate } from '@/hooks/useScheduleViewDate'
import { useSupabase } from '@/hooks/useSupabase'
import { writeProjectCookie } from '@/lib/project/project-cookie'
import { getSiteSupervisorMessages } from '@/lib/i18n/site-supervisor'
import {
  alertsToIssues,
  buildResourceSummary,
  computeSupervisorKpis,
  tasksToLookahead,
  tasksToTodayActivities,
} from '@/lib/supervisor/transforms'
import type { AiActionRow, TodayActivity } from '@/lib/supervisor/types'
import type { DashboardUserContext } from '@/types/dashboard'
import type { ProjectAlert, ProjectTask } from '@/types/schedule'
import { fetchAllProjectTasks, fetchUnresolvedAlerts } from '@/utils/schedule'
import { fetchInventoryItems } from '@/utils/storekeeper/inventory'
import {
  confirmAiAction,
  confirmDailyReportDraft,
  createAiActionDraft,
  fetchSupervisorAiDrafts,
  rejectAiAction,
  rejectDailyReportDraft,
  submitQuickReport,
  updateAiActionText,
} from '@/utils/supervisor/dashboard'
import { cn } from '@/lib/utils'

interface SiteSupervisorDashboardProps {
  initialContext: DashboardUserContext
  projectOptions: { id: string; name: string }[]
  initialProjectId: string | null
  initialTasks: ProjectTask[]
  initialAlerts: ProjectAlert[]
}

type ActionDialog = 'purchase' | 'pm_comment' | 'hse_alert' | 'instruction' | null

export function SiteSupervisorDashboard({
  initialContext,
  projectOptions,
  initialProjectId,
  initialTasks,
  initialAlerts,
}: SiteSupervisorDashboardProps) {
  const supabase = useSupabase()
  const { locale, dir } = useLocale()
  const t = getSiteSupervisorMessages(locale)
  const isRtl = dir === 'rtl'
  const { viewDate } = useScheduleViewDate()

  const [projectId, setProjectId] = useState<string | null>(initialProjectId)
  const [tasks, setTasks] = useState(initialTasks)
  const [alerts, setAlerts] = useState(initialAlerts)
  const [inventory, setInventory] = useState<Awaited<ReturnType<typeof fetchInventoryItems>>>([])
  const [aiDrafts, setAiDrafts] = useState<AiActionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [quickReportActivity, setQuickReportActivity] = useState<TodayActivity | null>(null)
  const [actionDialog, setActionDialog] = useState<ActionDialog>(null)
  const [actionTaskId, setActionTaskId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [generatedAction, setGeneratedAction] = useState<AiActionRow | null>(null)

  // Form fields for action dialogs
  const [purchaseMaterial, setPurchaseMaterial] = useState('')
  const [purchaseQty, setPurchaseQty] = useState('1')
  const [purchaseUnit, setPurchaseUnit] = useState('عدد')
  const [purchaseDate, setPurchaseDate] = useState(viewDate)
  const [purchasePriority, setPurchasePriority] = useState<'normal' | 'urgent' | 'critical'>('normal')
  const [purchaseReason, setPurchaseReason] = useState('')
  const [pmCategory, setPmCategory] = useState('general')
  const [pmNote, setPmNote] = useState('')
  const [hseSeverity, setHseSeverity] = useState('warning')
  const [hseDesc, setHseDesc] = useState('')
  const [instructionText, setInstructionText] = useState('')

  const loadData = useCallback(async () => {
    if (!projectId) {
      setTasks([])
      setAlerts([])
      setInventory([])
      setAiDrafts([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [taskRows, alertRows, invRows, drafts] = await Promise.all([
        fetchAllProjectTasks(supabase, projectId),
        fetchUnresolvedAlerts(supabase, projectId),
        fetchInventoryItems(supabase, projectId).catch(() => []),
        fetchSupervisorAiDrafts(supabase, projectId, initialContext.userId).catch(() => []),
      ])
      setTasks(taskRows)
      setAlerts(alertRows)
      setInventory(invRows)
      setAiDrafts(drafts)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError)
    } finally {
      setLoading(false)
    }
  }, [projectId, supabase, initialContext.userId, t.loadError])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const todayActivities = useMemo(
    () => tasksToTodayActivities(tasks, viewDate, inventory),
    [tasks, viewDate, inventory]
  )
  const lookahead = useMemo(() => tasksToLookahead(tasks, viewDate), [tasks, viewDate])
  const resources = useMemo(
    () => buildResourceSummary(inventory, todayActivities.length),
    [inventory, todayActivities.length]
  )
  const kpis = useMemo(
    () => computeSupervisorKpis(tasks, todayActivities, viewDate),
    [tasks, todayActivities, viewDate]
  )
  const issues = useMemo(() => alertsToIssues(alerts, tasks), [alerts, tasks])

  function handleProjectChange(id: string) {
    setProjectId(id)
    writeProjectCookie(id)
  }

  async function handleCreateAction(type: ActionDialog) {
    if (!projectId || !type) return
    setActionLoading(true)
    try {
      let payload: Record<string, unknown> = {}
      if (type === 'purchase') {
        payload = {
          material_name: purchaseMaterial,
          quantity: Number(purchaseQty),
          unit: purchaseUnit,
          needed_date: purchaseDate,
          priority: purchasePriority,
          reason: purchaseReason,
        }
      } else if (type === 'pm_comment') {
        payload = { category: pmCategory, note: pmNote }
      } else if (type === 'hse_alert') {
        payload = { severity: hseSeverity, description: hseDesc }
      } else if (type === 'instruction') {
        const task = tasks.find((x) => x.id === actionTaskId)
        payload = { activity_name: task?.name ?? 'Activity', instruction: instructionText }
      }

      const actionType =
        type === 'instruction'
          ? 'subcontractor_instruction'
          : type === 'purchase'
            ? 'purchase_request'
            : type

      const draft = await createAiActionDraft(supabase, {
        type: actionType,
        projectId,
        supervisorId: initialContext.userId,
        payload,
        relatedTaskId: actionTaskId ?? undefined,
        locale: locale === 'fa' ? 'fa' : 'en',
      })
      setGeneratedAction(draft)
      setAiDrafts((prev) => [draft, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (projectOptions.length === 0) {
    return (
      <EmptyState
        title={t.title}
        description="Ask the project admin to add you with Site Supervisor position."
      />
    )
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

      {loading && tasks.length === 0 ? <LoadingBlock label={t.saving} /> : null}
      {error ? <ErrorBlock message={error} onRetry={() => void loadData()} /> : null}

      <SupervisorSummaryCards kpis={kpis} labels={t} />

      <TodayActivitiesTable
        activities={todayActivities}
        labels={t}
        isRtl={isRtl}
        onOpenQuickReport={(id) => {
          const act = todayActivities.find((a) => a.id === id) ?? null
          setQuickReportActivity(act)
        }}
        onCreateInstruction={(id) => {
          setActionTaskId(id)
          setInstructionText('')
          setGeneratedAction(null)
          setActionDialog('instruction')
        }}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <LookaheadPanel activities={lookahead} labels={t} isRtl={isRtl} />
        <IssuesAlertsPanel
          issues={issues}
          labels={t}
          onDraftPmComment={(issueId) => {
            const issue = issues.find((i) => i.id === issueId)
            setPmNote(issue?.description ?? '')
            setGeneratedAction(null)
            setActionDialog('pm_comment')
          }}
        />
      </div>

      <ResourcesPanel
        resources={resources}
        labels={t}
        onRequestPurchase={() => {
          setGeneratedAction(null)
          setActionDialog('purchase')
        }}
      />

      <SectionCard
        title={t.aiActions}
        action={
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => { setGeneratedAction(null); setActionDialog('hse_alert') }}>
              {t.hseAlert}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { setGeneratedAction(null); setActionDialog('pm_comment') }}>
              {t.pmComment}
            </Button>
          </div>
        }
      >
        {aiDrafts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{t.noAiDrafts}</p>
        ) : (
          <div className="space-y-4 p-4">
            {aiDrafts.slice(0, 5).map((draft) => (
              <div key={draft.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  <Badge variant="outline">{draft.type}</Badge>
                </div>
                <AiDraftViewer
                  text={draft.text_generated}
                  status={draft.status}
                  labels={t}
                  onApprove={async (text) => {
                    if (text !== draft.text_generated) {
                      await updateAiActionText(supabase, draft.id, text)
                    }
                    await confirmAiAction(supabase, draft.id, initialContext.userId)
                    void loadData()
                  }}
                  onReject={async () => {
                    await rejectAiAction(supabase, draft.id, initialContext.userId)
                    void loadData()
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <QuickReportDialog
        open={!!quickReportActivity}
        onClose={() => setQuickReportActivity(null)}
        activity={quickReportActivity}
        projectId={projectId ?? ''}
        supervisorId={initialContext.userId}
        viewDate={viewDate}
        labels={t}
        locale={locale === 'fa' ? 'fa' : 'en'}
        onSubmit={async (input) => {
          const { report, summaryText } = await submitQuickReport(supabase, input, locale === 'fa' ? 'fa' : 'en')
          return { summaryText, reportId: report.id }
        }}
        onApproveReport={async (reportId, text) => {
          await confirmDailyReportDraft(supabase, reportId, initialContext.userId, text)
          void loadData()
        }}
        onRejectReport={async (reportId) => {
          await rejectDailyReportDraft(supabase, reportId, initialContext.userId)
        }}
      />

      <ModalOverlay
        open={actionDialog !== null}
        onClose={() => {
          setActionDialog(null)
          setGeneratedAction(null)
        }}
        title={
          actionDialog === 'purchase'
            ? t.requestPurchase
            : actionDialog === 'pm_comment'
              ? t.pmComment
              : actionDialog === 'hse_alert'
                ? t.hseAlert
                : t.aiInstruction
        }
      >
        {!generatedAction ? (
          <div className="space-y-4">
            {actionDialog === 'purchase' ? (
              <>
                <div className="space-y-2">
                  <Label>Material</Label>
                  <Input value={purchaseMaterial} onChange={(e) => setPurchaseMaterial(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Qty</Label>
                    <Input type="number" value={purchaseQty} onChange={(e) => setPurchaseQty(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input value={purchaseUnit} onChange={(e) => setPurchaseUnit(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Needed date</Label>
                  <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea rows={3} value={purchaseReason} onChange={(e) => setPurchaseReason(e.target.value)} />
                </div>
              </>
            ) : null}
            {actionDialog === 'pm_comment' ? (
              <>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={pmCategory} onValueChange={setPmCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delay">Delay risk</SelectItem>
                      <SelectItem value="resource">Resource</SelectItem>
                      <SelectItem value="coordination">Coordination</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea rows={4} value={pmNote} onChange={(e) => setPmNote(e.target.value)} />
              </>
            ) : null}
            {actionDialog === 'hse_alert' ? (
              <>
                <Select value={hseSeverity} onValueChange={setHseSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea rows={4} value={hseDesc} onChange={(e) => setHseDesc(e.target.value)} />
              </>
            ) : null}
            {actionDialog === 'instruction' ? (
              <Textarea rows={5} value={instructionText} onChange={(e) => setInstructionText(e.target.value)} placeholder="Instruction to subcontractor..." />
            ) : null}
            <Button type="button" className="w-full" disabled={actionLoading} onClick={() => void handleCreateAction(actionDialog)}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.submitReport}
            </Button>
          </div>
        ) : (
          <AiDraftViewer
            text={generatedAction.text_generated}
            status={generatedAction.status}
            labels={t}
            loading={actionLoading}
            onApprove={async (text) => {
              setActionLoading(true)
              try {
                if (text !== generatedAction.text_generated) {
                  await updateAiActionText(supabase, generatedAction.id, text)
                }
                await confirmAiAction(supabase, generatedAction.id, initialContext.userId)
                setActionDialog(null)
                setGeneratedAction(null)
                void loadData()
              } finally {
                setActionLoading(false)
              }
            }}
            onReject={async () => {
              await rejectAiAction(supabase, generatedAction.id, initialContext.userId)
              setGeneratedAction(null)
            }}
            onRegenerate={() => void handleCreateAction(actionDialog)}
          />
        )}
      </ModalOverlay>
    </div>
  )
}
