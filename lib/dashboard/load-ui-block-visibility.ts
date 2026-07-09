import type { SupabaseClient } from '@supabase/supabase-js'
import type { DashboardUserContext } from '@/types/dashboard'
import {
  fetchMemberUiBlockPreferences,
  mergeMemberUiBlockPreferences,
} from '@/lib/dashboard/member-ui-block-preferences'
import {
  getPositionIdsForProject,
  resolveVisibleUiBlockCodes,
} from '@/lib/dashboard/resolve-ui-block-visibility'

/** Server-side loader for role dashboard UI block visibility (role + personal prefs). */
export async function loadUiBlockVisibility(
  supabase: SupabaseClient,
  context: DashboardUserContext,
  activeProjectId: string | null,
  dashboard: string
): Promise<string[]> {
  const positionIds = getPositionIdsForProject(context.projects, activeProjectId)
  const base = await resolveVisibleUiBlockCodes(supabase, positionIds, {
    dashboard,
    showAll: context.isSystemAdmin,
  })

  if (!activeProjectId) return [...base]

  const preferences = await fetchMemberUiBlockPreferences(
    supabase,
    context.userId,
    activeProjectId,
    dashboard
  )

  const merged = mergeMemberUiBlockPreferences(base, preferences, dashboard)
  return [...merged]
}
