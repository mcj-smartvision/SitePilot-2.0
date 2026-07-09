'use client'

import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  pmMetricHelpHref,
  type PmMetricGuideId,
} from '@/lib/project-manager/pm-metric-guides'
import { cn } from '@/lib/utils'

interface PmMetricHelpButtonProps {
  metricId: PmMetricGuideId
  isFa?: boolean
  className?: string
}

/** Tiny help control — opens a full guide in a new tab (dashboard stays open). */
export function PmMetricHelpButton({
  metricId,
  isFa = true,
  className,
}: PmMetricHelpButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        'h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-primary',
        className
      )}
      title={isFa ? 'راهنمای کامل این بخش' : 'Full guide for this section'}
      onClick={() => {
        window.open(pmMetricHelpHref(metricId), '_blank', 'noopener,noreferrer')
      }}
    >
      <CircleHelp className="h-3.5 w-3.5" />
      <span>{isFa ? 'راهنما' : 'Help'}</span>
    </Button>
  )
}
