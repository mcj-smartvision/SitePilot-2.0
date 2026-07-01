'use client'

import { FieldGrid, FileDropzone, SectionHeader, SwitchField } from '../FormFields'
import type { ProjectInitializationFormValues } from '@/lib/project-init/schema'

export function ScheduleUploadSection() {
  return (
    <div>
      <SectionHeader
        title="Schedule Upload"
        description="Upload the baseline schedule (P6 XER, MSP, or Primavera XML). Validation rules apply on import."
      />

      <FieldGrid cols={1}>
        <FileDropzone<ProjectInitializationFormValues>
          name="scheduleFileName"
          label="Baseline Schedule File"
          description="Accepted formats: .xer, .mpp, .xml, .xlsx"
          accept=".xer,.mpp,.xml,.xlsx,.csv"
        />

        <SwitchField<ProjectInitializationFormValues>
          name="validateScheduleOnUpload"
          label="Validate Schedule on Upload"
          description="Run integrity checks (logic ties, calendar, missing dates) before accepting the file."
        />
        <SwitchField<ProjectInitializationFormValues>
          name="autoLinkActivities"
          label="Auto-Link Activities"
          description="Automatically map activities to WBS templates when templates are configured server-side."
        />
        <SwitchField<ProjectInitializationFormValues>
          name="requireBaselineApproval"
          label="Require Baseline Approval"
          description="Baseline must be approved before progress tracking begins — standard for EPC contracts."
        />
      </FieldGrid>
    </div>
  )
}
