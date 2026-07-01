'use client'

import {
  DESIGN_STAGES,
  FOUNDATION_TYPES,
  SOIL_CLASSIFICATIONS,
  STRUCTURE_TYPES,
} from '@/lib/project-init/constants'
import { FieldGrid, NumberField, SectionHeader, SelectField, SubsectionTitle, TextField } from '../FormFields'
import type { ProjectInitializationFormValues } from '@/lib/project-init/schema'

export function TechnicalInfoSection() {
  return (
    <div>
      <SectionHeader
        title="Technical Information"
        description="Structural system, geotechnical context, building metrics, and design stage for planning controls."
      />

      <FieldGrid cols={2}>
        <SubsectionTitle>Structure</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues> name="structureType" label="Structure Type" required options={STRUCTURE_TYPES} />
        <TextField<ProjectInitializationFormValues> name="primaryMaterial" label="Primary Material" />

        <SubsectionTitle>Foundation</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues> name="foundationType" label="Foundation Type" required options={FOUNDATION_TYPES} />
        <SelectField<ProjectInitializationFormValues> name="soilClassification" label="Soil Classification" options={SOIL_CLASSIFICATIONS} />

        <SubsectionTitle>Building Information</SubsectionTitle>
        <NumberField<ProjectInitializationFormValues> name="numberOfFloors" label="Number of Floors" />
        <NumberField<ProjectInitializationFormValues> name="totalBuiltArea" label="Total Built Area (m²)" />
        <NumberField<ProjectInitializationFormValues> name="basementLevels" label="Basement Levels" />

        <SubsectionTitle>Design Information</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues> name="designStage" label="Design Stage" required options={DESIGN_STAGES} />
        <TextField<ProjectInitializationFormValues> name="designStandard" label="Design Standard / Code" />
        <TextField<ProjectInitializationFormValues> name="architectFirm" label="Architect Firm" />
      </FieldGrid>
    </div>
  )
}
