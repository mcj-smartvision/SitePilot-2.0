import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/shared'
import { ScheduleImportPanel } from '@/components/admin/schedule-import-panel'
import { fetchProjectTasksSummary, fetchScheduleImports } from '@/lib/schedule/msp-import'
import { fetchProjectScheduleMeta } from '@/lib/schedule/apply-actual-start'

export default async function ProjectSchedulePage({ params }: { params: { projectId: string } }) {
  const supabase = createClient()

  const [imports, taskSummary, scheduleMeta] = await Promise.all([
    fetchScheduleImports(supabase, params.projectId),
    fetchProjectTasksSummary(supabase, params.projectId),
    fetchProjectScheduleMeta(supabase, params.projectId),
  ])

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Schedule"
        description="Import MSP XML, confirm actual project start, and view tasks in Gregorian or Shamsi calendar."
      />

      <ScheduleImportPanel
        projectId={params.projectId}
        initialImports={imports}
        taskCount={taskSummary.count}
        previewTasks={taskSummary.tasks}
        scheduleBaselineStart={scheduleMeta.schedule_baseline_start}
        scheduleActualStart={scheduleMeta.schedule_actual_start}
      />
    </div>
  )
}
