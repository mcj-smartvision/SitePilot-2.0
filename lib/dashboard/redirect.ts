import type { DashboardUserContext } from '@/types/dashboard'
import { getRoleDashboardRoute } from '@/lib/admin/role-dashboard-routes'
import { resolvePrimaryRole } from '@/lib/dashboard/roles'
import {
  ACCOUNTANT_SHELL_CHOICE_PATH,
  shouldAskAccountantShell,
} from '@/lib/dashboard/accountant-shell'

/**
 * Where the user lands after login / opening the site root.
 * Prefer the role-specific dashboard (e.g. accountant → shell choice)
 * instead of the generic /dashboard hub.
 */
export function resolvePostLoginPath(context: DashboardUserContext): string {
  if (context.isFirstLogin) return '/first-login'
  if (context.isSystemAdmin) return '/admin'

  if (shouldAskAccountantShell(context)) {
    return ACCOUNTANT_SHELL_CHOICE_PATH
  }

  const primary = resolvePrimaryRole(context.positionKeys)
  if (primary) {
    const route = getRoleDashboardRoute(primary)
    if (route) return route
  }

  // Fallback: first assigned role that has a live dashboard
  for (const key of context.positionKeys) {
    const route = getRoleDashboardRoute(key)
    if (route) return route
  }

  return '/dashboard'
}
