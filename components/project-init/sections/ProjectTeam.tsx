'use client'

import { FieldGrid, SectionHeader, SubsectionTitle, TextField } from '../FormFields'
import type { ProjectInitializationFormValues } from '@/lib/project-init/schema'

export function ProjectTeamSection() {
  return (
    <div>
      <SectionHeader
        title="Project Team"
        description="Key personnel assignments. User accounts and IDs are linked server-side after submission."
      />

      <FieldGrid cols={2}>
        <SubsectionTitle>Management</SubsectionTitle>
        <TextField<ProjectInitializationFormValues> name="projectDirector" label="Project Director" />
        <TextField<ProjectInitializationFormValues> name="projectManager" label="Project Manager" required />
        <TextField<ProjectInitializationFormValues> name="constructionManager" label="Construction Manager" />

        <SubsectionTitle>Engineering</SubsectionTitle>
        <TextField<ProjectInitializationFormValues> name="leadEngineer" label="Lead Engineer" />
        <TextField<ProjectInitializationFormValues> name="structuralEngineer" label="Structural Engineer" />
        <TextField<ProjectInitializationFormValues> name="mepEngineer" label="MEP Engineer" />

        <SubsectionTitle>Quality Assurance</SubsectionTitle>
        <TextField<ProjectInitializationFormValues> name="qaManager" label="QA Manager" />
        <TextField<ProjectInitializationFormValues> name="qcInspector" label="QC Inspector" />

        <SubsectionTitle>Commercial</SubsectionTitle>
        <TextField<ProjectInitializationFormValues> name="commercialManager" label="Commercial Manager" />
        <TextField<ProjectInitializationFormValues> name="procurementLead" label="Procurement Lead" />
      </FieldGrid>
    </div>
  )
}
