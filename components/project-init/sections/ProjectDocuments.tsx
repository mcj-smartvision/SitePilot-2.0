'use client'

import { FieldGrid, FileDropzone, SectionHeader, SubsectionTitle, TextareaField } from '../FormFields'
import type { ProjectInitializationFormValues } from '@/lib/project-init/schema'

export function ProjectDocumentsSection() {
  return (
    <div>
      <SectionHeader
        title="Project Documents"
        description="Upload and categorize key project documents. Files are stored server-side with metadata."
      />

      <FieldGrid cols={2}>
        <SubsectionTitle>Contract Documents</SubsectionTitle>
        <FileDropzone<ProjectInitializationFormValues>
          name="contractDocumentsFile"
          label="Upload Contract Documents"
          accept=".pdf,.doc,.docx"
        />
        <TextareaField<ProjectInitializationFormValues> name="contractDocumentsNote" label="Contract Documents Notes" rows={2} />

        <SubsectionTitle>Drawings</SubsectionTitle>
        <FileDropzone<ProjectInitializationFormValues> name="drawingsFile" label="Upload Drawings" accept=".pdf,.dwg,.dxf" />
        <TextareaField<ProjectInitializationFormValues> name="drawingsNote" label="Drawings Notes" rows={2} />

        <SubsectionTitle>Specifications</SubsectionTitle>
        <FileDropzone<ProjectInitializationFormValues> name="specificationsFile" label="Upload Specifications" accept=".pdf,.doc,.docx" />
        <TextareaField<ProjectInitializationFormValues> name="specificationsNote" label="Specifications Notes" rows={2} />

        <SubsectionTitle>Permits & Licenses</SubsectionTitle>
        <FileDropzone<ProjectInitializationFormValues> name="permitsFile" label="Upload Permits" accept=".pdf,.jpg,.png" />
        <TextareaField<ProjectInitializationFormValues> name="permitsNote" label="Permits Notes" rows={2} />
      </FieldGrid>
    </div>
  )
}
