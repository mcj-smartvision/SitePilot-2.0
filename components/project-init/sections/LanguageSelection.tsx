'use client'

import { useFormContext } from 'react-hook-form'
import { FieldGrid, SectionHeader, SelectField } from '../FormFields'
import { useProjectFormI18n } from '../ProjectFormI18n'
import type { ProjectInitializationFormValues } from '@/lib/project-init/schema'

export function LanguageSelectionSection() {
  const { setValue, watch } = useFormContext<ProjectInitializationFormValues>()
  const { t, options } = useProjectFormI18n()
  const selected = watch('interfaceLanguage')

  function handleLanguageChange(value: string) {
    setValue('interfaceLanguage', value, { shouldValidate: true })
    setValue('language', value, { shouldDirty: true })
  }

  return (
    <div>
      <SectionHeader title={t('sections.language.title')} description={t('sections.language.description')} />

      <FieldGrid cols={1}>
        <SelectField<ProjectInitializationFormValues>
          name="interfaceLanguage"
          label={t('fields.interfaceLanguage')}
          required
          options={options.languages}
          placeholder={t('ui.selectPlaceholder')}
          description={t('descriptions.interfaceLanguage')}
          onValueChange={handleLanguageChange}
        />

        {selected ? (
          <p className="text-sm text-muted-foreground rounded-md border bg-muted/40 p-3">
            {t('ui.selected')}: <strong>{options.languages.find((l) => l.value === selected)?.label}</strong>
            {' — '}
            {t('ui.languageHint')}
          </p>
        ) : null}
      </FieldGrid>
    </div>
  )
}
