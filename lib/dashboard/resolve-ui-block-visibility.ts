import type { SupabaseClient } from '@supabase/supabase-js'
import {
  UI_BLOCK_BY_CODE,
  UI_BLOCK_CATALOG,
  getBlocksForDashboard,
  type UiBlockDefinition,
} from '@/lib/dashboard/ui-block-catalog'
import type { DashboardUiBlock, PositionUiBlockVisibility } from '@/types/admin'

interface VisibilityAssignmentRow {
  is_visible: boolean
  position_id: string
  block:
    | { code: string; default_visible: boolean; is_active: boolean; dashboard: string }
    | { code: string; default_visible: boolean; is_active: boolean; dashboard: string }[]
    | null
}

function normalizeBlock(
  block: VisibilityAssignmentRow['block']
): { code: string; default_visible: boolean; is_active: boolean; dashboard: string } | null {
  if (!block) return null
  if (Array.isArray(block)) return block[0] ?? null
  return block
}

function catalogToBlock(def: UiBlockDefinition): DashboardUiBlock {
  return {
    id: def.code,
    code: def.code,
    key: def.key,
    kind: def.kind,
    dashboard: def.dashboard,
    layer: def.layer,
    title_fa: def.titleFa,
    title_en: def.titleEn,
    description_fa: def.descriptionFa,
    legacy_widget_key: def.legacyWidgetKey ?? null,
    sort_order: def.sortOrder,
    default_visible: def.defaultVisible,
    is_active: true,
  }
}

/** Active blocks from DB, falling back to in-app catalog when table is empty. */
export async function fetchActiveUiBlocks(
  supabase: SupabaseClient,
  dashboard?: string
): Promise<DashboardUiBlock[]> {
  let query = supabase
    .from('dashboard_ui_blocks')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  if (dashboard) {
    query = query.in('dashboard', dashboard === 'cross' ? ['cross'] : [dashboard, 'cross'])
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  if (data?.length) return data as DashboardUiBlock[]

  const fallback = dashboard ? getBlocksForDashboard(dashboard) : UI_BLOCK_CATALOG
  return fallback.map(catalogToBlock)
}

export async function fetchPositionUiBlockVisibility(
  supabase: SupabaseClient,
  projectId: string
): Promise<PositionUiBlockVisibility[]> {
  const { data: positions, error: positionsError } = await supabase
    .from('positions')
    .select('id')
    .eq('project_id', projectId)

  if (positionsError) throw new Error(positionsError.message)

  const positionIds = (positions ?? []).map((p) => p.id)
  if (positionIds.length === 0) return []

  const { data, error } = await supabase
    .from('position_ui_block_visibility')
    .select('*, block:dashboard_ui_blocks(*)')
    .in('position_id', positionIds)

  if (error) throw new Error(error.message)
  return (data ?? []) as PositionUiBlockVisibility[]
}

export async function upsertUiBlockVisibility(
  supabase: SupabaseClient,
  input: { position_id: string; block_id: string; is_visible: boolean; sort_order?: number }
): Promise<void> {
  const { error } = await supabase.from('position_ui_block_visibility').upsert(
    {
      position_id: input.position_id,
      block_id: input.block_id,
      is_visible: input.is_visible,
      sort_order: input.sort_order ?? 100,
    },
    { onConflict: 'position_id,block_id' }
  )

  if (error) throw new Error(error.message)
}

export interface ResolveUiBlockVisibilityOptions {
  dashboard?: string
  /** System admins and PM bypass position restrictions when true */
  showAll?: boolean
}

/**
 * Returns visible block codes for the user's positions.
 * Uses OR across positions: visible if any assigned position allows it.
 * Falls back to catalog/DB default_visible when no assignment exists.
 */
export async function resolveVisibleUiBlockCodes(
  supabase: SupabaseClient,
  positionIds: string[],
  options: ResolveUiBlockVisibilityOptions = {}
): Promise<Set<string>> {
  const { dashboard, showAll = false } = options

  const blocks = await fetchActiveUiBlocks(supabase, dashboard)
  if (showAll) return new Set(blocks.map((b) => b.code))

  if (positionIds.length === 0) {
    return new Set(blocks.filter((b) => b.default_visible).map((b) => b.code))
  }

  const { data: assignments, error } = await supabase
    .from('position_ui_block_visibility')
    .select('is_visible, position_id, block:dashboard_ui_blocks(code, default_visible, is_active, dashboard)')
    .in('position_id', positionIds)

  if (error || !assignments?.length) {
    return new Set(blocks.filter((b) => b.default_visible).map((b) => b.code))
  }

  const assignmentRows = assignments as unknown as VisibilityAssignmentRow[]
  const byCode = new Map<string, boolean[]>()

  for (const row of assignmentRows) {
    const block = normalizeBlock(row.block)
    if (!block?.is_active) continue
    if (dashboard && block.dashboard !== dashboard && block.dashboard !== 'cross') continue
    const list = byCode.get(block.code) ?? []
    list.push(row.is_visible)
    byCode.set(block.code, list)
  }

  const visible = new Set<string>()
  for (const block of blocks) {
    const overrides = byCode.get(block.code)
    if (!overrides?.length) {
      if (block.default_visible) visible.add(block.code)
      continue
    }
    if (overrides.some(Boolean)) visible.add(block.code)
  }

  return visible
}

export function isUiBlockVisible(visibleCodes: Set<string> | undefined, code: string): boolean {
  if (!visibleCodes) {
    const def = UI_BLOCK_BY_CODE[code]
    return def?.defaultVisible ?? true
  }
  return visibleCodes.has(code)
}

/** Position IDs for the active project from dashboard user context. */
export function getPositionIdsForProject(
  projects: { project: { id: string }; positions: { id: string }[] }[],
  projectId: string | null
): string[] {
  if (!projectId) return []
  const ctx = projects.find((p) => p.project.id === projectId)
  return ctx?.positions.map((p) => p.id) ?? []
}

export const DASHBOARD_LABELS_FA: Record<string, string> = {
  general: 'عمومی (/dashboard)',
  'project-manager': 'مدیر پروژه',
  'site-supervisor': 'سرپرست کارگاه',
  storekeeper: 'انباردار',
  procurement: 'تدارکات',
  qc: 'کنترل کیفیت',
  hse: 'HSE',
  security: 'امنیت',
  cross: 'درخواست‌های مشترک',
}

export const BLOCK_KIND_LABELS_FA: Record<string, string> = {
  widget: 'ویجت',
  kpi: 'KPI',
  chart: 'نمودار',
  table: 'جدول',
  panel: 'پنل',
  action: 'اقدام',
  request: 'درخواست',
}
