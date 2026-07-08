import type { SupabaseClient } from '@supabase/supabase-js'
import type { DashboardUserContext } from '@/types/dashboard'
import {
  getPositionIdsForProject,
  resolveVisibleUiBlockCodes,
} from '@/lib/dashboard/resolve-ui-block-visibility'

/** Server-side loader for role dashboard UI block visibility. */
export async function loadUiBlockVisibility(
  supabase: SupabaseClient,
  context: DashboardUserContext,
  activeProjectId: string | null,
  dashboard: string
): Promise<string[]> {
  const positionIds = getPositionIdsForProject(context.projects, activeProjectId)
  const visible = await resolveVisibleUiBlockCodes(supabase, positionIds, {
    dashboard,
    showAll: context.isSystemAdmin,
  })
  return [...visible]
}
