'use client'

import {
  BIM_LEVELS,
  ENVIRONMENTAL_STANDARDS,
  QUALITY_STANDARDS,
  REGIONS,
  SAFETY_STANDARDS,
  TIMEZONES,
} from '@/lib/project-init/constants'
import { FieldGrid, SectionHeader, SelectField, SubsectionTitle, SwitchField } from '../FormFields'
import type { ProjectInitializationFormValues } from '@/lib/project-init/schema'

export function StandardsLocationSection() {
  return (
    <div>
      <SectionHeader
        title="Standards & Location"
        description="Regional compliance standards and BIM coordination settings for multi-disciplinary teams."
      />

      <FieldGrid cols={2}>
        <SubsectionTitle>Region</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues> name="region" label="Region" required options={REGIONS} />
        <SelectField<ProjectInitializationFormValues> name="timezone" label="Timezone" required options={TIMEZONES} />

        <SubsectionTitle>Standards</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues> name="safetyStandard" label="Safety Standard" required options={SAFETY_STANDARDS} />
        <SelectField<ProjectInitializationFormValues> name="qualityStandard" label="Quality Standard" options={QUALITY_STANDARDS} />
        <SelectField<ProjectInitializationFormValues>
          name="environmentalStandard"
          label="Environmental Standard"
          options={ENVIRONMENTAL_STANDARDS}
        />

        <SubsectionTitle>BIM Settings</SubsectionTitle>
        <SwitchField<ProjectInitializationFormValues> name="bimEnabled" label="BIM Enabled" description="Enable BIM workflows for this project." />
        <SelectField<ProjectInitializationFormValues> name="bimLevel" label="BIM Level" options={BIM_LEVELS} />
        <SwitchField<ProjectInitializationFormValues>
          name="modelCoordinationRequired"
          label="Model Coordination Required"
          description="Require clash detection / coordination before site issuance."
          className="md:col-span-2"
        />
      </FieldGrid>
    </div>
  )
}
