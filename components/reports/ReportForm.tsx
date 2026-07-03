'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProjects, useSubmitReport } from '@/hooks/useReports'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

export function ReportForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [projectId, setProjectId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { projects, loading: projectsLoading, error: projectsError } = useProjects()
  const { state, submit, reset } = useSubmitReport()
  const isBusy = ['uploading', 'analyzing', 'saving'].includes(state.status)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!projectId || !selectedFile) return
    const result = await submit(selectedFile, projectId)
    if (result) setTimeout(() => router.push('/reports'), 800)
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>ثبت گزارش عکس کارگاه</CardTitle>
        <CardDescription>عکس را آپلود کنید تا AI فعالیت، نیروی کار و تجهیزات را تشخیص دهد.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>پروژه</Label>
            {projectsLoading ? <Skeleton className="h-10 w-full" /> : projectsError ? (
              <Alert variant="destructive"><AlertDescription>{projectsError}</AlertDescription></Alert>
            ) : projects.length === 0 ? (
              <Alert>
                <AlertDescription>
                  پروژه‌ای یافت نشد. در Supabase → SQL Editor اسکریپت ساخت پروژه نمونه را اجرا کنید.
                </AlertDescription>
              </Alert>
            ) : (
              <Select value={projectId} onValueChange={setProjectId} disabled={isBusy}>
                <SelectTrigger><SelectValue placeholder="انتخاب پروژه" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo">عکس کارگاه</Label>
            <input ref={fileInputRef} id="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={isBusy}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
          </div>
          {isBusy && (<div className="space-y-2"><Progress value={state.progress} /><p className="text-sm text-muted-foreground">{state.message}</p></div>)}
          {state.status === 'error' && state.error && (
            <Alert variant="destructive"><AlertTitle>خطا</AlertTitle><AlertDescription>{state.error}</AlertDescription></Alert>
          )}
          <Button type="submit" disabled={!projectId || !selectedFile || isBusy}>{isBusy ? 'در حال پردازش...' : 'آپلود و تحلیل'}</Button>
        </form>
      </CardContent>
    </Card>
  )
}
