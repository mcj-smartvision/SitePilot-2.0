import { type ConstructionStandard, type StandardRegion } from '../standards-catalog'
import { getDictionary, getStandardLabel, getStandardRegionLabel } from './utils'

const REGION_FALLBACK: Record<StandardRegion, string> = {
  US: 'United States',
  CA: 'Canada',
  DE: 'Germany',
  EU: 'Europe (EU / Eurocodes)',
  IR: 'Iran',
  INTL: 'International',
}

/** Localized grouped standard dropdown options — separate file avoids circular imports with locale dictionaries */
export function toLocalizedGroupedSelectOptionsByRegion(
  standards: ConstructionStandard[],
  locale?: string
) {
  const dict = getDictionary(locale)
  const groups = new Map<StandardRegion, ConstructionStandard[]>()

  for (const s of standards) {
    const list = groups.get(s.region) ?? []
    list.push(s)
    groups.set(s.region, list)
  }

  return Array.from(groups.entries()).map(([region, items]) => ({
    group: getStandardRegionLabel(locale, region, REGION_FALLBACK[region]),
    options: items.map((s) => ({
      value: s.value,
      label: getStandardLabel(locale, s.value, dict.standards[s.value] ?? s.label),
    })),
  }))
}
