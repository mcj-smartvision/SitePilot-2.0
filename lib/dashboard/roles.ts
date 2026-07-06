/** Canonical site role keys — aligned with `positions.key` in the database. */
export const SITE_ROLES = {
  PROJECT_MANAGER: 'project_manager',
  SITE_SUPERVISOR: 'site_supervisor',
  STOREKEEPER: 'storekeeper',
  PROCUREMENT: 'procurement_officer',
  QC: 'qa_qc_inspector',
  HSE: 'hse_officer',
  SECURITY: 'security',
  CLIENT: 'client',
} as const

export type SiteRoleKey = (typeof SITE_ROLES)[keyof typeof SITE_ROLES]

export const SITE_ROLE_LABELS: Record<SiteRoleKey, string> = {
  project_manager: 'Project Manager',
  site_supervisor: 'Site Supervisor',
  storekeeper: 'Storekeeper',
  procurement_officer: 'Procurement',
  qa_qc_inspector: 'QC',
  hse_officer: 'HSE',
  security: 'Security',
  client: 'Client',
}

/** Higher index = lower priority when resolving a primary role. */
export const ROLE_PRIORITY: SiteRoleKey[] = [
  SITE_ROLES.PROJECT_MANAGER,
  SITE_ROLES.SITE_SUPERVISOR,
  SITE_ROLES.QC,
  SITE_ROLES.HSE,
  SITE_ROLES.PROCUREMENT,
  SITE_ROLES.STOREKEEPER,
  SITE_ROLES.SECURITY,
  SITE_ROLES.CLIENT,
]

/** Default widget keys shown per role (overridden by DB visibility when configured). */
export const ROLE_WIDGET_KEYS: Record<SiteRoleKey, string[]> = {
  project_manager: [
    'overview.stats',
    'progress.overview',
    'inventory.stock',
    'reports.daily',
    'reports.recent',
    'security.alerts',
    'security.entry_exit',
    'schedule.overview',
    'safety.overview',
  ],
  site_supervisor: [
    'reports.daily',
    'reports.recent',
    'schedule.overview',
    'safety.overview',
    'security.entry_exit',
    'overview.stats',
  ],
  storekeeper: ['inventory.stock', 'overview.stats'],
  procurement_officer: ['schedule.overview', 'overview.stats'],
  qa_qc_inspector: ['schedule.overview', 'overview.stats'],
  hse_officer: ['safety.overview', 'overview.stats'],
  security: ['security.entry_exit', 'security.alerts', 'overview.stats'],
  client: ['progress.overview', 'financial.overview', 'reports.recent'],
}

export function resolvePrimaryRole(positionKeys: string[]): SiteRoleKey | null {
  for (const role of ROLE_PRIORITY) {
    if (positionKeys.includes(role)) return role
  }
  return null
}

export function getWidgetsForRole(role: SiteRoleKey | null): string[] {
  if (!role) return ['overview.stats']
  return ROLE_WIDGET_KEYS[role]
}
