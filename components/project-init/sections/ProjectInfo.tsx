'use client'

import {
  BUILDING_CLASSIFICATIONS,
  CONTRACT_TYPES,
  COUNTRIES,
  PROJECT_PHASES,
  PROJECT_STATUSES,
  PROJECT_TYPES,
  SECTORS,
} from '@/lib/project-init/constants'
import { FieldGrid, NumberField, SectionHeader, SelectField, SubsectionTitle, TextField, TextareaField } from './FormFields'
import type { ProjectInitializationFormValues } from '@/lib/project-init/schema'

export function ProjectInfoSection() {
  return (
    <div>
      <SectionHeader
        title="Project Information"
        description="Core project identity, client details, contract metadata, classification, and site location."
      />

      <FieldGrid cols={2}>
        <SubsectionTitle>Basic Information</SubsectionTitle>
        <TextField<ProjectInitializationFormValues> name="projectName" label="Project Name" required />
        <TextField<ProjectInitializationFormValues> name="projectCode" label="Project Code" required />
        <SelectField<ProjectInitializationFormValues> name="projectType" label="Project Type" required options={PROJECT_TYPES} />
        <SelectField<ProjectInitializationFormValues> name="status" label="Status" required options={PROJECT_STATUSES} />
        <TextareaField<ProjectInitializationFormValues> name="description" label="Description" className="md:col-span-2" />

        <SubsectionTitle>Client</SubsectionTitle>
        <TextField<ProjectInitializationFormValues> name="clientName" label="Client Name" required />
        <TextField<ProjectInitializationFormValues> name="clientContact" label="Client Contact Person" />
        <TextField<ProjectInitializationFormValues> name="clientEmail" label="Client Email" type="email" />
        <TextField<ProjectInitializationFormValues> name="clientPhone" label="Client Phone" />

        <SubsectionTitle>Organization</SubsectionTitle>
        <TextField<ProjectInitializationFormValues> name="organizationName" label="Organization Name" />
        <TextField<ProjectInitializationFormValues> name="department" label="Department / Division" />

        <SubsectionTitle>Contract</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues> name="contractType" label="Contract Type" required options={CONTRACT_TYPES} />
        <TextField<ProjectInitializationFormValues> name="contractNumber" label="Contract Number" />
        <NumberField<ProjectInitializationFormValues> name="contractValue" label="Contract Value" />
        <TextField<ProjectInitializationFormValues> name="contractStartDate" label="Contract Start Date" type="date" />
        <TextField<ProjectInitializationFormValues> name="contractEndDate" label="Contract End Date" type="date" />

        <SubsectionTitle>Classification</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues>
          name="buildingClassification"
          label="Building Classification"
          required
          options={BUILDING_CLASSIFICATIONS}
        />
        <SelectField<ProjectInitializationFormValues> name="projectPhase" label="Project Phase" required options={PROJECT_PHASES} />
        <SelectField<ProjectInitializationFormValues> name="sector" label="Sector" options={SECTORS} />

        <SubsectionTitle>Workforce Planning</SubsectionTitle>
        <NumberField<ProjectInitializationFormValues> name="estimatedWorkforce" label="Estimated Average Workforce" />
        <NumberField<ProjectInitializationFormValues> name="peakWorkforce" label="Peak Workforce" />

        <SubsectionTitle>Notes</SubsectionTitle>
        <TextareaField<ProjectInitializationFormValues> name="internalNotes" label="Internal Notes" />
        <TextareaField<ProjectInitializationFormValues> name="publicNotes" label="Public / Client Notes" />

        <SubsectionTitle>Location</SubsectionTitle>
        <TextField<ProjectInitializationFormValues> name="address" label="Site Address" required className="md:col-span-2" />
        <TextField<ProjectInitializationFormValues> name="city" label="City" required />
        <SelectField<ProjectInitializationFormValues> name="country" label="Country" required options={COUNTRIES} />
        <TextField<ProjectInitializationFormValues> name="latitude" label="Latitude" />
        <TextField<ProjectInitializationFormValues> name="longitude" label="Longitude" />
        <NumberField<ProjectInitializationFormValues> name="siteArea" label="Site Area (m²)" />
      </FieldGrid>
    </div>
  )
}
