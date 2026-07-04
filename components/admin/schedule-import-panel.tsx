'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ProjectTask, ScheduleImport } from '@/types/schedule'
import { CalendarRange, CheckCircle2, FileUp, Loader2, AlertTriangle } from 'lucide-react'

interface ScheduleImportPanelProps {
  projectId: string
  initialImports: ScheduleImport[]
  taskCount: number
  previewTasks: ProjectTask[]
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

function statusBadge(status: ScheduleImport['status']) {
  if (status === 'completed') return <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>
  if (status === 'failed') return <Badge variant="destructive">Failed</Badge>
  if (status === 'processing') return <Badge variant="secondary">Processing</Badge>
  return <Badge variant="outline">Pending</Badge>
}

export function ScheduleImportPanel({
  projectId,
  initialImports,
  taskCount,
  previewTasks,
}: ScheduleImportPanelProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleImport() {
    if (!file) {
      setError('Select an MSP XML file first.')
      return
    }

    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.xml')) {
      setError('Only XML files are supported. In Microsoft Project: File → Save As → XML.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('project_id', projectId)
      formData.append('file', file)

      const response = await fetch('/api/schedule/import-msp', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Import failed')

      setSuccess(
        `Imported ${data.tasks_imported} tasks and ${data.dependencies_imported} dependencies.`
      )
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card border-primary/20">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarRange className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Import MSP Schedule</CardTitle>
              <CardDescription>
                Upload Microsoft Project XML. Tasks appear in Site Supervisor and Project Manager dashboards.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="rounded-lg border border-dashed bg-muted/20 p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              In Microsoft Project: <strong>File → Save As → XML</strong> (not .mpp)
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
            {file ? (
              <p className="text-xs text-muted-foreground">Selected: {file.name}</p>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="text-sm text-emerald-700 flex items-center gap-2 bg-emerald-50 rounded-md px-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </p>
          ) : null}

          <Button type="button" onClick={handleImport} disabled={loading || !file}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Importing...
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4 mr-2" />
                Import schedule
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{taskCount}</p>
            <p className="text-xs text-muted-foreground">Tasks in schedule</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-2xl font-bold">{initialImports.filter((i) => i.status === 'completed').length}</p>
            <p className="text-xs text-muted-foreground">Successful imports</p>
          </CardContent>
        </Card>
      </div>

      {previewTasks.length > 0 ? (
        <Card>
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-base">Schedule preview (first {previewTasks.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">WBS</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Task</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Start</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Finish</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {previewTasks.map((task) => (
                    <tr key={task.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{task.wbs_code ?? '—'}</td>
                      <td className="px-4 py-3">
                        {task.name}
                        {task.is_critical ? (
                          <Badge variant="destructive" className="ml-2 text-[10px]">
                            Critical
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{formatDate(task.start_planned)}</td>
                      <td className="px-4 py-3">{formatDate(task.finish_planned)}</td>
                      <td className="px-4 py-3">{task.percent_complete}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {initialImports.length > 0 ? (
        <Card>
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-base">Import history</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {initialImports.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{item.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()}
                    {item.status === 'completed'
                      ? ` · ${item.tasks_imported} tasks, ${item.dependencies_imported} links`
                      : ''}
                    {item.error_message ? ` · ${item.error_message}` : ''}
                  </p>
                </div>
                {statusBadge(item.status)}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
