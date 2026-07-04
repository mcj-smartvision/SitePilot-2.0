'use client'

import type { ReactNode } from 'react'
import { PageHeader } from '@/components/admin/shared'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Construction } from 'lucide-react'

interface PlaceholderRoleDashboardProps {
  title: string
  description: string
  roleLabel: string
  children?: ReactNode
}

export function PlaceholderRoleDashboard({
  title,
  description,
  roleLabel,
  children,
}: PlaceholderRoleDashboardProps) {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title={title} description={description} />
      <Card className="border-dashed">
        <CardContent className="py-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Construction className="h-7 w-7" />
          </div>
          <Badge variant="outline">{roleLabel}</Badge>
          {children ?? (
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              This module will be expanded in the next iteration. Existing admin, members, and storekeeper
              features remain unchanged.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
