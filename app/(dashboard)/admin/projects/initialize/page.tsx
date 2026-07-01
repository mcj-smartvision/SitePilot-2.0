'use client'

import Link from 'next/link'
import { ProjectForm } from '@/components/project-init/ProjectForm'
import { PageHeader } from '@/components/admin/shared'
import { Button } from '@/components/ui/button'

export default function ProjectInitializePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Initialization"
        description="Complete all 8 sections to initialize a new construction project. Hidden system IDs are assigned automatically on submit."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/projects">Back to Projects</Link>
          </Button>
        }
      />
      <ProjectForm />
    </div>
  )
}
