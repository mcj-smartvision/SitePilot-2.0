'use client'

import type { AdminActivityItem } from '@/types/admin'
import { Activity, AlertTriangle, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const typeIcons = {
  action: Activity,
  alert: AlertTriangle,
  security: Shield,
}

const typeColors = {
  action: 'bg-blue-50 text-blue-700',
  alert: 'bg-amber-50 text-amber-700',
  security: 'bg-red-50 text-red-700',
}

export function ActivityFeed({ activities }: { activities: AdminActivityItem[] }) {
  return (
    <div className="space-y-1">
      {activities.map((item) => {
        const Icon = typeIcons[item.type]
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
          >
            <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', typeColors[item.type])}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-medium text-sm">{item.user}</span>
                <span className="text-xs text-muted-foreground">· {item.role}</span>
              </div>
              <p className="text-sm text-foreground/80 mt-0.5">{item.action}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs rounded-md bg-muted px-1.5 py-0.5 font-medium">{item.section}</span>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
