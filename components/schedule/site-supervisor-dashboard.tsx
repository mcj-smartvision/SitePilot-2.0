'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bot, Loader2 } from 'lucide-react'
import { useLocale } from '@/components/i18n/locale-provider'
import { PageHeader, LoadingBlock, ErrorBlock, SectionCard, EmptyState } from '@/components/admin/shared'
import { ScheduleDateToolbar } from '@/components/schedule/schedule-date-toolbar'
import { ScheduleDateInput } from '@/components/schedule/schedule-date-input'
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
import { VoiceToTextButton } from '@/components/shared/voice-to-text-button'
import { getSupervisorRouteCopy } from '@/lib/shared/ai-action-routing'
import type { AiDraftLabels } from '@/lib/shared/ai-types'
import type { AiActionRow, AiActionType, TodayActivity } from '@/lib/supervisor/types'
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
import {
  UiBlockCustomizePanel,
  UiBlockGuard,
  UiBlockVisibilityProvider,
} from '@/components/dashboard/ui-block-visibility'

interface SiteSupervisorDashboardProps {
  initialContext: DashboardUserContext
  projectOptions: { id: string; name: string }[]
  initialProjectId: string | null
  initialTasks: ProjectTask[]
  initialAlerts: ProjectAlert[]
  visibleBlockCodes?: string[]
}

type ActionDialog = 'purchase' | 'pm_comment' | 'hse_alert' | 'instruction' | null

export function SiteSupervisorDashboard({
  initialContext,
  projectOptions,
  initialProjectId,
  initialTasks,
  initialAlerts,
  visibleBlockCodes = [],
}: SiteSupervisorDashboardProps) {
  const supabase = useSupabase()
  const { locale, dir } = useLocale()
  const t = getSiteSupervisorMessages(locale)
  const isRtl = dir === 'rtl'
  const isFa = locale === 'fa' || locale === 'ar'
  const { viewDate } = useScheduleViewDate()

  function labelsForAction(type: AiActionType | 'daily_report'): AiDraftLabels {
    const route = getSupervisorRouteCopy(type, isFa ? 'fa' : 'en')
    return {
      draftByAi: t.draftByAi,
      confirmed: t.confirmed,
      approveSend: route.approveSend,
      editText: t.editText,
      reject: t.reject,
      regenerate: t.regenerate,
      saving: t.saving,
      whatIsThis: route.whatIsThis,
      destinationHint: route.destinationHint,
    }
  }

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
        const todayRow = todayActivities.find((a) => a.id === actionTaskId)
        payload = {
          activity_name: task?.name ?? todayRow?.name ?? 'Activity',
          wbs_code: task?.wbs_code ?? todayRow?.wbs_code ?? '',
          subcontractor_name: todayRow?.subcontractor_name ?? '',
          instruction: instructionText,
          progress_percent: todayRow?.actual_progress_percent ?? task?.percent_complete ?? 0,
          planned_status: todayRow?.planned_status ?? '',
          is_critical: todayRow?.is_critical ?? task?.is_critical ?? false,
        }
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
    <UiBlockVisibilityProvider
      visibleCodes={visibleBlockCodes}
      showAdminBlockCodes={initialContext.isSystemAdmin}
      dashboard="site-supervisor"
      projectId={projectId}
    >
      <div className={cn('space-y-8', isRtl && 'text-right')}>
        <UiBlockCustomizePanel />

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

      {projectId ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 text-sm">
            <p className="font-medium text-sky-950">
              {isRtl ? 'لیست‌های دفتر فنی و وضعیت تأیید مدیر پروژه' : 'Technical Office lists & PM approval status'}
            </p>
            <p className="text-sky-900/80 mt-0.5 text-xs">
              {isRtl
                ? 'ببینید دفتر فنی چه نوشته، مدیر تأیید کرده یا نه، و کامنت بگذارید.'
                : 'See TO items, PM approval status, and leave comments.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" asChild>
              <Link href={`/site-ops/prepared?projectId=${projectId}&as=supervisor`}>
                {isRtl ? 'لیست‌های کارگاه' : 'Workshop lists'}
              </Link>
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={`/site-ops/schedule?projectId=${projectId}&as=supervisor`}>
                {isRtl ? 'مشاهده برنامه (فقط خواندنی)' : 'View schedule (read-only)'}
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {loading && tasks.length === 0 ? <LoadingBlock label={t.saving} /> : null}
      {error ? <ErrorBlock message={error} onRetry={() => void loadData()} /> : null}

      <UiBlockGuard code="SS-KPI-01">
        <SupervisorSummaryCards kpis={kpis} labels={t} />
      </UiBlockGuard>

      <UiBlockGuard code="SS-TBL-01">
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
      </UiBlockGuard>

      <div className="grid gap-6 xl:grid-cols-2">
        <UiBlockGuard code="SS-PNL-01">
          <LookaheadPanel activities={lookahead} labels={t} isRtl={isRtl} />
        </UiBlockGuard>
        <UiBlockGuard code="SS-PNL-03">
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
        </UiBlockGuard>
      </div>

      <UiBlockGuard code="SS-PNL-02">
        <ResourcesPanel
          resources={resources}
          labels={t}
          onRequestPurchase={() => {
            setGeneratedAction(null)
            setActionDialog('purchase')
          }}
        />
      </UiBlockGuard>

      <UiBlockGuard code="SS-PNL-04">
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
                  labels={labelsForAction(draft.type)}
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
      </UiBlockGuard>

      <UiBlockGuard code="SS-ACT-01">
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
      </UiBlockGuard>

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
                <ScheduleDateInput
                  label="Needed date"
                  valueIso={purchaseDate}
                  onChangeIso={setPurchaseDate}
                />
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
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed rounded-md border bg-muted/30 px-3 py-2">
                  {isFa
                    ? 'این دکمه «دستور کار» برای پیمانکار/اجراکننده همان فعالیت است. متن پیش‌نویس AI ساخته می‌شود؛ بعد از تأیید شما به مدیر پروژه می‌رود. ابلاغ نهایی فقط وقتی ممکن است که مدیر پروژه پیمانکار را قبلاً معرفی کرده باشد.'
                    : 'Work instruction for the subcontractor/crew. After you approve, it goes to the Project Manager. Final release requires a registered subcontractor.'}
                </p>
                <div className="flex justify-end">
                  <VoiceToTextButton
                    onTranscript={(text) =>
                      setInstructionText((prev) => (prev ? `${prev}\n${text}` : text))
                    }
                  />
                </div>
                <Textarea
                  rows={5}
                  value={instructionText}
                  onChange={(e) => setInstructionText(e.target.value)}
                  placeholder={
                    isFa
                      ? 'جزئیات دستور به پیمانکار (اختیاری — صدا یا تایپ)…'
                      : 'Instruction details (optional — voice or type)…'
                  }
                />
              </div>
            ) : null}
            <Button type="button" className="w-full" disabled={actionLoading} onClick={() => void handleCreateAction(actionDialog)}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.submitReport}
            </Button>
          </div>
        ) : (
          <AiDraftViewer
            text={generatedAction.text_generated}
            status={generatedAction.status}
            labels={labelsForAction(generatedAction.type)}
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
    </UiBlockVisibilityProvider>
  )
}
