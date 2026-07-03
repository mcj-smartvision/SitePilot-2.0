import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: string
  trendType?: 'up' | 'down' | 'neutral' | 'warning'
  className?: string
}

const trendColors = {
  up: 'text-emerald-600',
  down: 'text-red-600',
  neutral: 'text-muted-foreground',
  warning: 'text-amber-600',
}

export function StatCard({ label, value, icon: Icon, trend, trendType = 'neutral', className }: StatCardProps) {
  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <p className="admin-section-title">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {trend ? (
            <p className={cn('text-xs font-medium', trendColors[trendType])}>{trend}</p>
          ) : null}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
