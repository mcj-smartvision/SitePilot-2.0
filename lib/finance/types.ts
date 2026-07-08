export const FINANCIAL_COST_TYPES = [
  'materials',
  'labor',
  'equipment',
  'subcontractor',
  'overhead',
] as const

export type FinancialCostType = (typeof FINANCIAL_COST_TYPES)[number]

export const FINANCIAL_COST_TYPE_LABELS: Record<FinancialCostType, string> = {
  materials: 'Materials',
  labor: 'Labor',
  equipment: 'Equipment',
  subcontractor: 'Subcontractors',
  overhead: 'Overhead',
}

export const FINANCIAL_INVOICE_STATUSES = ['draft', 'sent', 'approved', 'paid'] as const
export type FinancialInvoiceStatus = (typeof FINANCIAL_INVOICE_STATUSES)[number]

export interface FinancialCost {
  id: string
  project_id: string
  date: string
  type: FinancialCostType
  item_code: string | null
  description: string
  amount: number
  invoice_reference: string | null
  major_item_id: string | null
  created_at: string
  created_by: string | null
}

export interface FinancialCostInput {
  project_id: string
  date: string
  type: FinancialCostType
  item_code?: string
  description?: string
  amount: number
  invoice_reference?: string
  created_by?: string
}

export interface CostSummary {
  totalAc: number
  byType: Record<FinancialCostType, number>
}

export interface CreateCostInput {
  projectId: string
  date: string
  type: FinancialCostType
  itemCode?: string
  description?: string
  amount: number
  invoiceReference?: string
  createdBy?: string
}
