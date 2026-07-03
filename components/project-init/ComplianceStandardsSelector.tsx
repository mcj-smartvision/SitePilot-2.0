'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { ShieldCheck, Lock } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { getStandardByKey } from '@/lib/compliance/catalog'
import {
  computeDefaultSelectedKeys,
  computeMandatoryStandardKeys,
  getAvailableStandardKeys,
} from '@/lib/compliance/region-standards'
import { getCategoryLabel, getStandardLabel } from '@/lib/compliance/labels'
import type { ProjectInitializationFormValues } from '@/lib/project-init/schema'
import { useProjectFormI18n } from './ProjectFormI18n'
import { CustomStandardsEditor } from './CustomStandardsEditor'

/** Editable standards checklist with mandatory auto-selection + custom standards */
export function ComplianceStandardsSelector() {
  const { watch, setValue, getValues } = useFormContext<ProjectInitializationFormValues>()
  const { t, locale } = useProjectFormI18n()

  const regulatoryRegion = watch('regulatoryRegion')
  const constructionType = watch('constructionType')
  const selectedStandards = watch('selectedStandards') ?? []
  const customStandards = watch('customStandards') ?? []

  const prevContext = useRef({ region: '', type: '' })

  const mandatoryKeys = useMemo(
    () => (regulatoryRegion && constructionType ? computeMandatoryStandardKeys(regulatoryRegion, constructionType) : []),
    [regulatoryRegion, constructionType]
  )

  const availableKeys = useMemo(
    () => (regulatoryRegion && regulatoryRegion !== 'custom' ? getAvailableStandardKeys(regulatoryRegion) : []),
    [regulatoryRegion]
  )

  useEffect(() => {
    if (!regulatoryRegion || !constructionType || regulatoryRegion === 'custom') return

    const contextChanged =
      prevContext.current.region !== regulatoryRegion || prevContext.current.type !== constructionType

    if (contextChanged) {
      prevContext.current = { region: regulatoryRegion, type: constructionType }
      const defaults = computeDefaultSelectedKeys(regulatoryRegion, constructionType)
      const current = getValues('selectedStandards') ?? []
      const preserved = current.filter((k) => availableKeys.includes(k))
      setValue('selectedStandards', [...new Set([...defaults, ...preserved, ...mandatoryKeys])], { shouldDirty: true })
      return
    }

    const current = getValues('selectedStandards') ?? []
    const missingMandatory = mandatoryKeys.filter((k) => !current.includes(k))
    if (missingMandatory.length > 0) {
      setValue('selectedStandards', [...new Set([...current, ...missingMandatory])], { shouldDirty: true })
    }
  }, [regulatoryRegion, constructionType, mandatoryKeys, availableKeys, setValue, getValues])

  const grouped = useMemo(() => {
    const groups: Record<string, { key: string; mandatory: boolean; category: string }[]> = {}
    for (const key of availableKeys) {
      const std = getStandardByKey(key)
      const category = std?.category ?? 'general'
      const list = groups[category] ?? []
      list.push({ key, mandatory: mandatoryKeys.includes(key), category })
      groups[category] = list
    }
    return groups
  }, [availableKeys, mandatoryKeys])

  const toggleStandard = (key: string, checked: boolean) => {
    if (mandatoryKeys.includes(key) && !checked) return
    const next = checked
      ? [...new Set([...selectedStandards, key])]
      : selectedStandards.filter((k) => k !== key)
    setValue('selectedStandards', next, { shouldDirty: true })
  }

  const selectAll = () => setValue('selectedStandards', [...availableKeys], { shouldDirty: true })
  const selectMandatoryOnly = () => setValue('selectedStandards', [...mandatoryKeys], { shouldDirty: true })

  if (!regulatoryRegion || !constructionType) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground md:col-span-2">
        {t('descriptions.compliancePreviewEmpty')}
      </div>
    )
  }

  if (regulatoryRegion === 'custom') {
    return (
      <div className="md:col-span-2 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">{t('subsections.projectStandards')}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t('descriptions.complianceCustomEmpty')}</p>
        <CustomStandardsEditor />
      </div>
    )
  }

  const selectedCatalogCount = selectedStandards.filter((k) => availableKeys.includes(k)).length
  const totalActive = selectedCatalogCount + customStandards.length

  return (
    <div className="md:col-span-2 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{t('subsections.projectStandards')}</p>
        <span className="text-xs text-muted-foreground">
          ({totalActive} {t('fields.standardsCount')}
          {customStandards.length > 0
            ? ` — ${selectedCatalogCount}/${availableKeys.length} ${t('ui.catalogStandards')}, ${customStandards.length} ${t('ui.customStandardsShort')}`
            : ` — ${selectedCatalogCount}/${availableKeys.length}`}
          )
        </span>
        <div className="ms-auto flex gap-2">
          <button type="button" onClick={selectMandatoryOnly} className="text-xs text-primary hover:underline">
            {t('ui.selectMandatoryOnly')}
          </button>
          <button type="button" onClick={selectAll} className="text-xs text-primary hover:underline">
            {t('ui.selectAllStandards')}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t('descriptions.complianceEngineNote')}</p>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="rounded-lg border bg-muted/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {getCategoryLabel(category, locale)}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map(({ key, mandatory }) => {
              const label = getStandardLabel(key, locale)
              const checked = selectedStandards.includes(key)
              return (
                <label
                  key={key}
                  className={`flex items-start gap-2 rounded-md p-2 text-sm ${mandatory ? 'bg-primary/5' : 'hover:bg-muted/30'} cursor-pointer`}
                >
                  <Checkbox
                    checked={checked}
                    disabled={mandatory}
                    onChange={(e) => toggleStandard(key, e.target.checked)}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="font-medium">{label.code}</span>
                    <span className="text-muted-foreground"> — {label.name}</span>
                    {mandatory ? (
                      <Badge variant="secondary" className="ms-2 inline-flex items-center gap-0.5 text-[10px]">
                        <Lock className="h-2.5 w-2.5" />
                        {t('ui.mandatoryStandard')}
                      </Badge>
                    ) : null}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      ))}

      <CustomStandardsEditor />
    </div>
  )
}
