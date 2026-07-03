'use client'

import { CONSTRUCTION_ROLES } from '@/lib/admin/construction-roles'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { Position } from '@/types/admin'

interface ConstructionRoleSelectProps {
  positions: Position[]
  value: string
  onChange: (positionId: string) => void
  label?: string
}

export function ConstructionRoleSelect({
  positions,
  value,
  onChange,
  label = 'Site Role / Position',
}: ConstructionRoleSelectProps) {
  const activePositions = positions.filter((p) => p.is_active)

  const sortedPositions = [...activePositions].sort((a, b) => {
    const aIdx = CONSTRUCTION_ROLES.findIndex((r) => r.key === a.key)
    const bIdx = CONSTRUCTION_ROLES.findIndex((r) => r.key === b.key)
    if (aIdx === -1 && bIdx === -1) return a.title.localeCompare(b.title)
    if (aIdx === -1) return 1
    if (bIdx === -1) return -1
    return aIdx - bIdx
  })

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} required>
        <SelectTrigger className="h-11">
          <SelectValue placeholder="Select construction site role..." />
        </SelectTrigger>
        <SelectContent className="max-h-[320px]">
          {sortedPositions.length === 0 ? (
            <SelectItem value="_none" disabled>
              No positions available — create a project first
            </SelectItem>
          ) : (
            sortedPositions.map((position) => (
              <SelectItem key={position.id} value={position.id}>
                {position.title}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Assign the member&apos;s primary site role. Each role has a dedicated dashboard view.
      </p>
    </div>
  )
}
