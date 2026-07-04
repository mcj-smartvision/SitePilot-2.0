import type { DashboardUserContext } from '@/types/dashboard'
import type { SiteRoleKey } from '@/lib/dashboard/roles'

/** Position keys that grant access to each role dashboard. */
export const ROLE_DASHBOARD_ACCESS: Record<string, SiteRoleKey[]> = {
  'site-supervisor': ['site_supervisor'],
  'project-manager': ['project_manager'],
  storekeeper: ['storekeeper'],
  procurement: ['procurement_officer'],
  security: ['security'],
}

export function hasRoleDashboardAccess(
  context: DashboardUserContext,
  dashboardSlug: keyof typeof ROLE_DASHBOARD_ACCESS
): boolean {
  if (context.isSystemAdmin) return true
  const allowedKeys = ROLE_DASHBOARD_ACCESS[dashboardSlug] ?? []
  return allowedKeys.some((key) => context.positionKeys.includes(key))
}

export function hasAnyScheduleRole(context: DashboardUserContext): boolean {
  if (context.isSystemAdmin) return true
  const allKeys = Object.values(ROLE_DASHBOARD_ACCESS).flat()
  return allKeys.some((key) => context.positionKeys.includes(key))
}
