import type { DashboardUserContext } from '@/types/dashboard'

export function resolvePostLoginPath(context: DashboardUserContext): string {
  if (context.isFirstLogin) return '/first-login'
  if (context.isSystemAdmin) return '/admin'
  return '/dashboard'
}
