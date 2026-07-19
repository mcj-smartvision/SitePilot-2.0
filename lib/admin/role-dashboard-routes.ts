/** Maps construction role keys to live dashboard routes (admin + assigned members). */
export const ROLE_DASHBOARD_ROUTES: Record<string, string> = {
  project_manager: '/dashboard/project-manager',
  site_supervisor: '/dashboard/site-supervisor',
  technical_office: '/dashboard/technical-office',
  storekeeper: '/dashboard/storekeeper',
  procurement_officer: '/dashboard/procurement',
  qa_qc_inspector: '/dashboard/qc',
  hse_officer: '/dashboard/hse',
  security: '/dashboard/security',
  project_accountant: '/dashboard/accountant',
}

export function getRoleDashboardRoute(roleKey: string): string | null {
  if (roleKey === 'finance_admin') {
    return ROLE_DASHBOARD_ROUTES.project_accountant ?? null
  }
  return ROLE_DASHBOARD_ROUTES[roleKey] ?? null
}

export function hasLiveRoleDashboard(roleKey: string): boolean {
  return roleKey in ROLE_DASHBOARD_ROUTES
}
