'use client'

import { useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { CONSTRUCTION_TYPES, REGULATORY_REGIONS } from '@/lib/compliance/catalog'
import { BIM_LEVELS } from '@/lib/project-init/constants'
import { ComplianceStandardsSelector } from '../ComplianceStandardsSelector'
import {
  FieldGrid,
  SectionHeader,
  SelectField,
  SubsectionTitle,
  SwitchField,
  TextField,
} from '../FormFields'
import { useProjectFormI18n } from '../ProjectFormI18n'
import type { ProjectInitializationFormValues } from '@/lib/project-init/schema'

export function StandardsLocationSection() {
  const { watch } = useFormContext<ProjectInitializationFormValues>()
  const { t, options, locale } = useProjectFormI18n()
  const regulatoryRegion = watch('regulatoryRegion')

  const regulatoryOptions = useMemo(
    () =>
      REGULATORY_REGIONS.map((item) => ({
        value: item.value,
        label: t(`options.regulatoryRegions.${item.value}`) || item.label,
      })),
    [t, locale]
  )

  const constructionTypeOptions = useMemo(
    () =>
      CONSTRUCTION_TYPES.map((item) => ({
        value: item.value,
        label: t(`options.constructionTypes.${item.value}`) || item.label,
      })),
    [t, locale]
  )

  const bimLevelOptions = BIM_LEVELS.map((item) => ({
    value: item.value,
    label: options.bimLevels.find((o) => o.value === item.value)?.label ?? item.label,
  }))

  return (
    <div>
      <SectionHeader
        title={t('sections.standardsLocation.title')}
        description={t('sections.standardsLocation.description')}
      />

      <FieldGrid cols={2}>
        <SubsectionTitle>{t('subsections.complianceFramework')}</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues>
          name="regulatoryRegion"
          label={t('fields.regulatoryRegion')}
          required
          options={regulatoryOptions}
          description={t('descriptions.regulatoryRegion')}
        />
        <SelectField<ProjectInitializationFormValues>
          name="constructionType"
          label={t('fields.constructionType')}
          required
          options={constructionTypeOptions}
          description={t('descriptions.constructionType')}
        />

        {regulatoryRegion === 'custom' ? (
          <>
            <TextField<ProjectInitializationFormValues>
              name="customRegulatoryNote"
              label={t('fields.customRegulatoryNote')}
              description={t('descriptions.customRegulatoryNote')}
              className="md:col-span-2"
            />
            <TextField<ProjectInitializationFormValues>
              name="customStandardNote"
              label={t('fields.customStandardNote')}
              description={t('descriptions.customStandardNote')}
              className="md:col-span-2"
            />
          </>
        ) : null}

        <ComplianceStandardsSelector />

        <SubsectionTitle>{t('subsections.region')}</SubsectionTitle>
        <SelectField<ProjectInitializationFormValues> name="region" label={t('fields.region')} required options={options.regions} />
        <SelectField<ProjectInitializationFormValues> name="timezone" label={t('fields.timezone')} required options={options.timezones} />

        <SubsectionTitle>{t('subsections.bimSettings')}</SubsectionTitle>
        <SwitchField<ProjectInitializationFormValues>
          name="bimEnabled"
          label={t('fields.bimEnabled')}
          description={t('descriptions.bimEnabled')}
        />
        <SelectField<ProjectInitializationFormValues> name="bimLevel" label={t('fields.bimLevel')} options={bimLevelOptions} />
        <SwitchField<ProjectInitializationFormValues>
          name="modelCoordinationRequired"
          label={t('fields.modelCoordinationRequired')}
          description={t('descriptions.modelCoordinationRequired')}
          className="md:col-span-2"
        />
      </FieldGrid>
    </div>
  )
}
