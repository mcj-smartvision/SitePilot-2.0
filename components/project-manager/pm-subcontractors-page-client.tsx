'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/admin/shared'
import { PmSubcontractorsPanel } from '@/components/project-manager/pm-subcontractors-panel'
import { writeProjectCookie } from '@/lib/project/project-cookie'
import type { DashboardUserContext } from '@/types/dashboard'

interface Props {
  initialContext: DashboardUserContext
  projectOptions: { id: string; name: string }[]
  initialProjectId: string | null
}

export function PmSubcontractorsPageClient({
  initialContext,
  projectOptions,
  initialProjectId,
}: Props) {
  const [projectId, setProjectId] = useState(initialProjectId)

  if (projectOptions.length === 0) {
    return <EmptyState title="پیمانکاران" description="پروژه‌ای تخصیص داده نشده است." />
  }

  const projectName =
    projectOptions.find((p) => p.id === projectId)?.name ?? projectOptions[0]?.name ?? ''

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 max-w-sm">
        <Label>پروژه</Label>
        <Select
          value={projectId ?? undefined}
          onValueChange={(id) => {
            setProjectId(id)
            writeProjectCookie(id)
          }}
        >
          <SelectTrigger>
            <SelectValue />
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

      {projectId ? (
        <PmSubcontractorsPanel
          key={projectId}
          projectId={projectId}
          projectName={projectName}
          userId={initialContext.userId}
        />
      ) : null}
    </div>
  )
}
