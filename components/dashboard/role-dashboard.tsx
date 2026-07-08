'use client'

import { useMemo } from 'react'
import { getWidgetDefinition } from '@/lib/dashboard/widget-registry'
import { blockCodeForLegacyWidget } from '@/lib/dashboard/ui-block-catalog'
import { SITE_ROLE_LABELS } from '@/lib/dashboard/roles'
import type { WidgetRenderContext } from '@/types/dashboard'
import { WidgetGrid, WidgetGridItem } from '@/components/widgets/widget-shell'
import { PageHeader } from '@/components/admin/shared'
import { Label } from '@/components/ui/label'
import {
  AdminUiBlockCatalogPanel,
  UiBlockGuard,
  UiBlockVisibilityProvider,
} from '@/components/dashboard/ui-block-visibility'

interface RoleDashboardProps {
  context: WidgetRenderContext
  widgetKeys: string[]
  visibleBlockCodes?: string[]
  showAdminBlockCodes?: boolean
  onProjectChange?: (projectId: string) => void
}

export function RoleDashboard({
  context,
  widgetKeys,
  visibleBlockCodes = [],
  showAdminBlockCodes = false,
  onProjectChange,
}: RoleDashboardProps) {
  const widgets = useMemo(
    () =>
      widgetKeys
        .map((key) => getWidgetDefinition(key))
        .filter((def): def is NonNullable<typeof def> => Boolean(def)),
    [widgetKeys]
  )

  const roleLabel = context.user.primaryRole
    ? SITE_ROLE_LABELS[context.user.primaryRole]
    : 'Team Member'

  return (
    <UiBlockVisibilityProvider
      visibleCodes={visibleBlockCodes}
      showAdminBlockCodes={showAdminBlockCodes}
    >
      <div className="space-y-6">
        <AdminUiBlockCatalogPanel dashboard="general" />

        <PageHeader
          title={`${roleLabel} Dashboard`}
          description={`Welcome back, ${context.user.fullName}. Your workspace is tailored to your role.`}
        />

        {context.user.projects.length > 1 ? (
          <div className="max-w-sm space-y-2">
            <Label htmlFor="project-select">Active project</Label>
            <select
              id="project-select"
              value={context.projectId ?? ''}
              onChange={(e) => onProjectChange?.(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {context.user.projects.map(({ project }) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {widgets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No widgets configured for your role.</p>
        ) : (
          <WidgetGrid>
            {widgets.map((widget) => {
              const Component = widget.component
              const blockCode = blockCodeForLegacyWidget(widget.key) ?? 'GEN-WGT-01'
              return (
                <WidgetGridItem key={widget.key} colSpan={widget.colSpan}>
                  <UiBlockGuard code={blockCode}>
                    <Component context={context} />
                  </UiBlockGuard>
                </WidgetGridItem>
              )
            })}
          </WidgetGrid>
        )}
      </div>
    </UiBlockVisibilityProvider>
  )
}
