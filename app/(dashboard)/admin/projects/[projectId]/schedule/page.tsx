import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/admin/shared'
import { ScheduleImportPanel } from '@/components/admin/schedule-import-panel'
import { fetchProjectTasksSummary, fetchScheduleImports } from '@/lib/schedule/msp-import'

export default async function ProjectSchedulePage({ params }: { params: { projectId: string } }) {
  const supabase = createClient()

  const [imports, taskSummary] = await Promise.all([
    fetchScheduleImports(supabase, params.projectId),
    fetchProjectTasksSummary(supabase, params.projectId),
  ])

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Schedule"
        description="Import Microsoft Project (MSP) XML for this site. Tasks feed Site Supervisor and Project Manager dashboards."
      />

      <ScheduleImportPanel
        projectId={params.projectId}
        initialImports={imports}
        taskCount={taskSummary.count}
        previewTasks={taskSummary.tasks}
      />
    </div>
  )
}
