'use client'

import type { ReactNode } from 'react'
import { PageHeader, SectionCard } from '@/components/admin/shared'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { UI_BLOCK_BY_CODE } from '@/lib/dashboard/ui-block-catalog'
import {
  UiBlockCustomizePanel,
  UiBlockGuard,
  UiBlockVisibilityProvider,
} from '@/components/dashboard/ui-block-visibility'
import { Construction } from 'lucide-react'

interface PlaceholderRoleDashboardProps {
  title: string
  description: string
  roleLabel: string
  dashboard: string
  projectId?: string | null
  blockCodes?: string[]
  visibleBlockCodes?: string[]
  showAdminBlockCodes?: boolean
  children?: ReactNode
}

export function PlaceholderRoleDashboard({
  title,
  description,
  roleLabel,
  dashboard,
  projectId = null,
  blockCodes = [],
  visibleBlockCodes = [],
  showAdminBlockCodes = false,
  children,
}: PlaceholderRoleDashboardProps) {
  return (
    <UiBlockVisibilityProvider
      visibleCodes={visibleBlockCodes}
      showAdminBlockCodes={showAdminBlockCodes}
      dashboard={dashboard}
      projectId={projectId}
    >
      <div className="space-y-6 max-w-4xl">
        <UiBlockCustomizePanel />

        <PageHeader title={title} description={description} />

        {blockCodes.length > 0 ? (
          <div className="space-y-4">
            {blockCodes.map((code) => {
              const def = UI_BLOCK_BY_CODE[code]
              return (
                <UiBlockGuard key={code} code={code}>
                  <SectionCard title={def?.titleFa ?? code}>
                    <Card className="border-dashed shadow-none">
                      <CardContent className="py-8 text-center space-y-3">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Construction className="h-6 w-6" />
                        </div>
                        <Badge variant="outline">{roleLabel}</Badge>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          {def?.descriptionFa ?? 'این ماژول در نسخه بعدی تکمیل می‌شود.'}
                        </p>
                      </CardContent>
                    </Card>
                  </SectionCard>
                </UiBlockGuard>
              )
            })}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Construction className="h-7 w-7" />
              </div>
              <Badge variant="outline">{roleLabel}</Badge>
              {children ?? (
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  This module will be expanded in the next iteration. Existing admin, members, and
                  storekeeper features remain unchanged.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </UiBlockVisibilityProvider>
  )
}
