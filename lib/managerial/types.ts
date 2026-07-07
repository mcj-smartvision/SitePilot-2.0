import type { StatusLevel, ActionPriority } from '@/lib/managerial/status'

export interface ManagerialKpi {
  key: string
  labelFa: string
  value: number
  unit: string
  status: StatusLevel
  explanationFa: string
  trendDelta: number
  thresholdWarning: number
  thresholdCritical: number
}

export interface RiskItem {
  id: string
  titleFa: string
  detailFa: string
  status: StatusLevel
}

export interface ActionItem {
  id: string
  titleFa: string
  detailFa: string
  priority: ActionPriority
  href?: string
}

export interface ExecutiveSummary {
  overallStatus: StatusLevel
  dailyConclusionFa: string
  topRisks: RiskItem[]
  immediateActions: ActionItem[]
  prioritizedActions: ActionItem[]
  kpis: ManagerialKpi[]
}

export interface ManagerialProjectSnapshot {
  projectName: string
  phaseFa: string
  projectProgress: number
  plannedProgress: number
  actualProgress: number
  scheduleDelayDays: number
  materialAvailability: number
  manpowerCoverage: number
  equipmentAvailability: number
  safetyRisk: number
  blockersCount: number
}
