/** Shared status logic for managerial dashboards (Persian labels). */

export type StatusLevel = 'stable' | 'warning' | 'critical'

export function calculateKpiStatus(
  value: number,
  warningAt: number,
  criticalAt: number,
  higherIsBetter = true
): StatusLevel {
  if (higherIsBetter) {
    if (value <= criticalAt) return 'critical'
    if (value <= warningAt) return 'warning'
    return 'stable'
  }
  if (value >= criticalAt) return 'critical'
  if (value >= warningAt) return 'warning'
  return 'stable'
}

export function calculateOverallStatus(levels: StatusLevel[]): StatusLevel {
  if (levels.some((l) => l === 'critical')) return 'critical'
  if (levels.some((l) => l === 'warning')) return 'warning'
  return 'stable'
}

export function getStatusColor(level: StatusLevel): string {
  switch (level) {
    case 'stable':
      return '#059669'
    case 'warning':
      return '#d97706'
    case 'critical':
      return '#dc2626'
  }
}

export function getStatusBgClass(level: StatusLevel): string {
  switch (level) {
    case 'stable':
      return 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30'
    case 'warning':
      return 'bg-amber-500/10 text-amber-900 border-amber-500/30'
    case 'critical':
      return 'bg-red-500/10 text-red-800 border-red-500/30'
  }
}

export function getStatusLabel(level: StatusLevel): string {
  switch (level) {
    case 'stable':
      return 'پایدار'
    case 'warning':
      return 'هشدار'
    case 'critical':
      return 'بحرانی'
  }
}

export function getOverallStatusLabel(level: StatusLevel): string {
  switch (level) {
    case 'stable':
      return 'در مسیر — On Track'
    case 'warning':
      return 'نیاز به توجه — At Risk'
    case 'critical':
      return 'بحرانی — Critical'
  }
}

export type ActionPriority = 'high' | 'medium' | 'low'

export function getActionPriority(status: StatusLevel, impact: 'schedule' | 'safety' | 'material' | 'general'): ActionPriority {
  if (status === 'critical') return 'high'
  if (status === 'warning' && (impact === 'schedule' || impact === 'safety')) return 'high'
  if (status === 'warning') return 'medium'
  return 'low'
}

export function formatTrendFa(delta: number, unit = '%'): string {
  if (delta > 0) return `${delta}${unit} بهتر از هفته قبل`
  if (delta < 0) return `${Math.abs(delta)}${unit} بدتر از هفته قبل`
  return 'بدون تغییر نسبت به هفته قبل'
}
