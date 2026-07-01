'use client'

import { CURRENCIES, DATE_FORMATS, LANGUAGES, WEATHER_PROVIDERS } from '@/lib/project-init/constants'
import { FieldGrid, SectionHeader, SelectField, SubsectionTitle, SwitchField } from '../FormFields'
import type { ProjectInitializationFormValues } from '@/lib/project-init/schema'

export function ProjectSettingsSection() {
  return (
    <div>
      <SectionHeader
        title="Project Settings"
        description="Regional preferences, weather integration, dashboard modules, and field permissions."
      />

      <FieldGrid cols={2}>
        <SubsectionTitle>Regional Settings</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues> name="currency" label="Currency" required options={CURRENCIES} />
        <SelectField<ProjectInitializationFormValues> name="language" label="Language" required options={LANGUAGES} />
        <SelectField<ProjectInitializationFormValues> name="dateFormat" label="Date Format" required options={DATE_FORMATS} />

        <SubsectionTitle>Weather Provider</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues> name="weatherProvider" label="Weather Provider" required options={WEATHER_PROVIDERS} />
        <SwitchField<ProjectInitializationFormValues>
          name="enableWeatherAlerts"
          label="Enable Weather Alerts"
          description="Notify site teams of adverse weather affecting crane ops or concrete pours."
        />

        <SubsectionTitle>Dashboard Modules</SubsectionTitle>
        <SwitchField<ProjectInitializationFormValues> name="enableSafetyDashboard" label="Safety Dashboard" />
        <SwitchField<ProjectInitializationFormValues> name="enableProgressDashboard" label="Progress Dashboard" />
        <SwitchField<ProjectInitializationFormValues> name="enableCostDashboard" label="Cost Dashboard" />

        <SubsectionTitle>Permissions</SubsectionTitle>
        <SwitchField<ProjectInitializationFormValues> name="allowFieldReporting" label="Allow Field Reporting" />
        <SwitchField<ProjectInitializationFormValues> name="allowPhotoUpload" label="Allow Photo Upload" />
        <SwitchField<ProjectInitializationFormValues>
          name="requireApprovalForReports"
          label="Require Approval for Reports"
          description="Reports must be approved by a supervisor before publishing to stakeholders."
          className="md:col-span-2"
        />
      </FieldGrid>
    </div>
  )
}
