import type { DashboardUserContext } from '@/types/dashboard'
import { SITE_ROLE_LABELS, type SiteRoleKey } from '@/lib/dashboard/roles'

export interface RoleNavLink {
  href: string
  label: string
  roleKey: SiteRoleKey
}

const ROLE_DASHBOARD_PATHS: Record<SiteRoleKey, string> = {
  project_manager: '/dashboard/project-manager',
  site_supervisor: '/dashboard/site-supervisor',
  storekeeper: '/dashboard/storekeeper',
  procurement_officer: '/dashboard/procurement',
  security: '/dashboard/security',
  client: '/dashboard',
}

/** Navigation links visible in header based on assigned position keys. */
export function getRoleNavLinks(context: DashboardUserContext): RoleNavLink[] {
  const links: RoleNavLink[] = []
  const seen = new Set<string>()

  for (const key of context.positionKeys) {
    const roleKey = key as SiteRoleKey
    const href = ROLE_DASHBOARD_PATHS[roleKey]
    if (!href || seen.has(href) || roleKey === 'client') continue
    seen.add(href)
    links.push({
      href,
      label: SITE_ROLE_LABELS[roleKey] ?? roleKey,
      roleKey,
    })
  }

  return links
}
