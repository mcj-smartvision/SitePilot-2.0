'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DollarSign, Loader2, Plus, Trash2 } from 'lucide-react'
import { PageHeader, LoadingBlock, ErrorBlock, SectionCard, EmptyState } from '@/components/admin/shared'
import { StatCard } from '@/components/admin/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormattedDate } from '@/components/schedule/formatted-date'
import { MoneyInput, parseMoneyInput } from '@/components/finance/money-input'
import { useSupabase } from '@/hooks/useSupabase'
import {
  FINANCIAL_COST_TYPES,
  FINANCIAL_COST_TYPE_LABELS,
  type FinancialCost,
  type FinancialCostType,
} from '@/lib/finance/types'
import { writeProjectCookie } from '@/lib/project/project-cookie'
import type { DashboardUserContext } from '@/types/dashboard'
import {
  buildCostSummary,
  createFinancialCost,
  deleteFinancialCost,
  fetchFinancialCosts,
} from '@/utils/finance/costs'
import { cn } from '@/lib/utils'

interface CostsDashboardProps {
  initialContext: DashboardUserContext
  projectOptions: { id: string; name: string }[]
  initialProjectId: string | null
  canEdit?: boolean
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

export function CostsDashboard({
  initialContext,
  projectOptions,
  initialProjectId,
  canEdit = false,
}: CostsDashboardProps) {
  const supabase = useSupabase()
  const [projectId, setProjectId] = useState<string | null>(initialProjectId)
  const [rows, setRows] = useState<FinancialCost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [filterType, setFilterType] = useState<FinancialCostType | 'all'>('all')
  const [filterItemCode, setFilterItemCode] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const [formDate, setFormDate] = useState(todayInputValue())
  const [formType, setFormType] = useState<FinancialCostType>('materials')
  const [formItemCode, setFormItemCode] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formInvoiceRef, setFormInvoiceRef] = useState('')
  const [showForm, setShowForm] = useState(false)

  const loadData = useCallback(async () => {
    if (!projectId) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchFinancialCosts(supabase, projectId, {
        type: filterType,
        itemCode: filterItemCode,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
      })
      setRows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load costs')
    } finally {
      setLoading(false)
    }
  }, [projectId, supabase, filterType, filterItemCode, filterDateFrom, filterDateTo])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const summary = useMemo(() => buildCostSummary(rows), [rows])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!projectId || !canEdit) return
    const amount = parseMoneyInput(formAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Amount must be greater than zero.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createFinancialCost(supabase, {
        projectId,
        date: formDate,
        type: formType,
        itemCode: formItemCode,
        description: formDescription,
        amount,
        invoiceReference: formInvoiceRef,
        createdBy: initialContext.userId,
      })
      setFormAmount('')
      setFormDescription('')
      setFormItemCode('')
      setFormInvoiceRef('')
      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cost')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!canEdit || !confirm('Delete this cost record?')) return
    setError(null)
    try {
      await deleteFinancialCost(supabase, id)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  function handleProjectChange(id: string) {
    setProjectId(id)
    writeProjectCookie(id)
  }

  if (projectOptions.length === 0) {
    return (
      <EmptyState
        title="Costs Dashboard"
        description="Ask the admin to assign you as Project Accountant on a project."
      />
    )
  }

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Costs Dashboard"
        description="Record and review actual project costs (AC) — materials, labor, equipment, subcontractors, overhead."
        actions={
          projectOptions.length > 1 ? (
            <Select value={projectId ?? undefined} onValueChange={handleProjectChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projectOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null
        }
      />

      {error ? <ErrorBlock message={error} onRetry={() => void loadData()} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total AC" value={formatMoney(summary.totalAc)} icon={DollarSign} />
        {FINANCIAL_COST_TYPES.map((type) => (
          <StatCard
            key={type}
            label={FINANCIAL_COST_TYPE_LABELS[type]}
            value={formatMoney(summary.byType[type])}
            icon={DollarSign}
          />
        ))}
      </div>

      <SectionCard
        title="Filters"
        action={
          canEdit ? (
            <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4 me-1" />
              {showForm ? 'Hide form' : 'Add cost'}
            </Button>
          ) : null
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FinancialCostType | 'all')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {FINANCIAL_COST_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {FINANCIAL_COST_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Item code</Label>
            <Input
              value={filterItemCode}
              onChange={(e) => setFilterItemCode(e.target.value)}
              placeholder="e.g. ELEV-01"
            />
          </div>
          <div className="space-y-2">
            <Label>From date</Label>
            <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>To date</Label>
            <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
          </div>
        </div>

        {showForm && canEdit ? (
          <form onSubmit={(e) => void handleSubmit(e)} className="border-t p-4 space-y-4 bg-muted/20">
            <p className="text-sm font-semibold">New cost record</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" required value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as FinancialCostType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FINANCIAL_COST_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {FINANCIAL_COST_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <MoneyInput value={formAmount} onChange={setFormAmount} required />
              </div>
              <div className="space-y-2">
                <Label>Item code</Label>
                <Input value={formItemCode} onChange={(e) => setFormItemCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Invoice #</Label>
                <Input value={formInvoiceRef} onChange={(e) => setFormInvoiceRef(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              Save cost
            </Button>
          </form>
        ) : null}
      </SectionCard>

      <SectionCard title="Latest cost records">
        {loading ? (
          <LoadingBlock label="Loading costs…" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No cost records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-start">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3 text-end">Amount</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Invoice</th>
                  {canEdit ? <th className="py-2 px-3 w-12" /> : null}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <FormattedDate value={row.date} />
                    </td>
                    <td className="py-2.5 px-3">{FINANCIAL_COST_TYPE_LABELS[row.type]}</td>
                    <td className="py-2.5 px-3 font-mono text-xs">{row.item_code ?? '—'}</td>
                    <td className="py-2.5 px-3 text-end font-medium tabular-nums">
                      {formatMoney(Number(row.amount))}
                    </td>
                    <td className={cn('py-2.5 px-3 max-w-[240px] truncate', !row.description && 'text-muted-foreground')}>
                      {row.description || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{row.invoice_reference ?? '—'}</td>
                    {canEdit ? (
                      <td className="py-2.5 px-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Delete"
                          onClick={() => void handleDelete(row.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
