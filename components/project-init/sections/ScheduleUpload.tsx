'use client'

import { FieldGrid, FileDropzone, SectionHeader, SwitchField } from '../FormFields'
import { useProjectFormI18n } from '../ProjectFormI18n'
import type { ProjectInitializationFormValues } from '@/lib/project-init/schema'

export function ScheduleUploadSection() {
  const { t } = useProjectFormI18n()

  return (
    <div>
      <SectionHeader title={t('sections.scheduleUpload.title')} description={t('sections.scheduleUpload.description')} />

      <FieldGrid cols={1}>
        <FileDropzone<ProjectInitializationFormValues>
          name="scheduleFileName"
          label={t('fields.scheduleFileName')}
          description={t('descriptions.scheduleFileName')}
          accept=".xer,.mpp,.xml,.xlsx,.csv"
        />

        <SwitchField<ProjectInitializationFormValues>
          name="validateScheduleOnUpload"
          label={t('fields.validateScheduleOnUpload')}
          description={t('descriptions.validateScheduleOnUpload')}
        />
        <SwitchField<ProjectInitializationFormValues>
          name="autoLinkActivities"
          label={t('fields.autoLinkActivities')}
          description={t('descriptions.autoLinkActivities')}
        />
        <SwitchField<ProjectInitializationFormValues>
          name="requireBaselineApproval"
          label={t('fields.requireBaselineApproval')}
          description={t('descriptions.requireBaselineApproval')}
        />
      </FieldGrid>
    </div>
  )
}
