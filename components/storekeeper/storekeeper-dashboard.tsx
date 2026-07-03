'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  Package,
  PenLine,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Warehouse,
} from 'lucide-react'
import { useLocale } from '@/components/i18n/locale-provider'
import { PageHeader, LoadingBlock, ErrorBlock, SectionCard } from '@/components/admin/shared'
import { StatCard } from '@/components/admin/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getStorekeeperMessages } from '@/lib/i18n/storekeeper'
import { writeProjectCookie } from '@/lib/project/project-cookie'
import type { ExtractedInvoiceLine } from '@/lib/storekeeper/types'
import type { DashboardUserContext } from '@/types/dashboard'
import { useSupabase } from '@/hooks/useSupabase'
import {
  analyzeInvoiceImage,
  confirmInventoryReceipt,
  confirmInventoryDispatch,
  createInventoryScan,
  fetchInventoryItems,
  fetchInventoryKpis,
  fetchInventoryTransactions,
  updateScanExtractedData,
  uploadInvoiceImage,
} from '@/utils/storekeeper/inventory'
import type { InventoryItemRow, InventoryKpis, InventoryTransactionRow } from '@/lib/storekeeper/types'

interface StorekeeperDashboardProps {
  initialContext: DashboardUserContext
  projectOptions?: { id: string; name: string }[]
  initialProjectId?: string | null
}

function newExtractedRow(): ExtractedInvoiceLine {
  return {
    id: crypto.randomUUID(),
    name: '',
    quantity: 1,
    unit: 'عدد',
  }
}

function todayDateInputValue() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function StorekeeperDashboard({
  initialContext,
  projectOptions: projectOptionsProp,
  initialProjectId,
}: StorekeeperDashboardProps) {
  const supabase = useSupabase()
  const { locale, dir } = useLocale()
  const t = getStorekeeperMessages(locale)
  const isRtl = dir === 'rtl'

  const [context] = useState(initialContext)
  const [projectId, setProjectId] = useState<string | null>(
    initialProjectId ?? initialContext.activeProjectId
  )
  const [items, setItems] = useState<InventoryItemRow[]>([])
  const [transactions, setTransactions] = useState<InventoryTransactionRow[]>([])
  const [kpis, setKpis] = useState<InventoryKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [scanFile, setScanFile] = useState<File | null>(null)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanId, setScanId] = useState<string | null>(null)
  const [extractedRows, setExtractedRows] = useState<ExtractedInvoiceLine[]>([])
  const [entryMode, setEntryMode] = useState<'none' | 'ai' | 'manual'>('none')
  const [transactionType, setTransactionType] = useState<'IN' | 'OUT'>('IN')
  const [invoiceDate, setInvoiceDate] = useState(todayDateInputValue)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [scannerError, setScannerError] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    if (!projectId) {
      setItems([])
      setTransactions([])
      setKpis(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [nextItems, nextTx, nextKpis] = await Promise.all([
        fetchInventoryItems(supabase, projectId),
        fetchInventoryTransactions(supabase, projectId),
        fetchInventoryKpis(supabase, projectId),
      ])
      setItems(nextItems)
      setTransactions(nextTx)
      setKpis(nextKpis)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loadError)
    } finally {
      setLoading(false)
    }
  }, [projectId, supabase, t.loadError])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    return () => {
      if (scanPreview) URL.revokeObjectURL(scanPreview)
    }
  }, [scanPreview])

  function handleProjectChange(nextProjectId: string) {
    setProjectId(nextProjectId)
    writeProjectCookie(nextProjectId)
    resetScanner()
  }

  function resetScanner() {
    setScanFile(null)
    if (scanPreview) URL.revokeObjectURL(scanPreview)
    setScanPreview(null)
    setScanId(null)
    setExtractedRows([])
    setEntryMode('none')
    setInvoiceDate(todayDateInputValue())
    setInvoiceNumber('')
    setScannerError(null)
    setSuccessMessage(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (uploadInputRef.current) uploadInputRef.current.value = ''
  }

  function startManualEntry() {
    setScannerError(null)
    setSuccessMessage(null)
    setScanFile(null)
    if (scanPreview) URL.revokeObjectURL(scanPreview)
    setScanPreview(null)
    setScanId(null)
    setEntryMode('manual')
    setExtractedRows([newExtractedRow()])
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (uploadInputRef.current) uploadInputRef.current.value = ''
  }

  function handleFileSelected(file: File | null) {
    if (!file) return
    setScannerError(null)
    setSuccessMessage(null)
    setEntryMode('ai')
    setScanFile(file)
    if (scanPreview) URL.revokeObjectURL(scanPreview)
    setScanPreview(URL.createObjectURL(file))
    setExtractedRows([])
    setScanId(null)
  }

  async function handleAnalyze() {
    if (!projectId || !scanFile) return

    setAnalyzing(true)
    setScannerError(null)
    setSuccessMessage(null)

    try {
      const imageUrl = await uploadInvoiceImage(supabase, projectId, scanFile)
      const newScanId = await createInventoryScan(supabase, projectId, imageUrl)
      setScanId(newScanId)

      const extracted = await analyzeInvoiceImage(supabase, scanFile)
      if (extracted.length === 0) {
        setExtractedRows([newExtractedRow()])
        setScannerError(t.analyzeError)
        return
      }

      setExtractedRows(
        extracted.map((row) => ({
          id: crypto.randomUUID(),
          name: row.name,
          quantity: Number(row.quantity),
          unit: row.unit || 'عدد',
        }))
      )

      await updateScanExtractedData(supabase, newScanId, extracted)
    } catch (err) {
      setScannerError(err instanceof Error ? err.message : t.analyzeError)
      if (extractedRows.length === 0) setExtractedRows([newExtractedRow()])
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleConfirmSave() {
    if (!projectId) return

    if (!invoiceDate.trim()) {
      setScannerError(t.invoiceDateRequired)
      return
    }

    const payload = extractedRows
      .map((row) => ({
        name: row.name.trim(),
        quantity: Number(row.quantity),
        unit: row.unit.trim() || 'عدد',
      }))
      .filter((row) => row.name && row.quantity > 0)

    if (payload.length === 0) {
      setScannerError(t.noExtracted)
      return
    }

    setSaving(true)
    setScannerError(null)

    const note =
      entryMode === 'manual'
        ? transactionType === 'IN'
          ? 'Manual invoice entry'
          : 'Manual dispatch entry'
        : transactionType === 'IN'
          ? 'AI invoice receipt'
          : 'AI dispatch document'

    try {
      const save = transactionType === 'IN' ? confirmInventoryReceipt : confirmInventoryDispatch
      await save(
        supabase,
        projectId,
        payload,
        invoiceDate,
        scanId,
        note,
        invoiceNumber.trim() || null
      )
      setSuccessMessage(transactionType === 'IN' ? t.successSaved : t.successDispatched)
      resetScanner()
      await loadData()
    } catch (err) {
      setScannerError(err instanceof Error ? err.message : t.saveError)
    } finally {
      setSaving(false)
    }
  }

  function updateExtractedRow(id: string, patch: Partial<ExtractedInvoiceLine>) {
    setExtractedRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeExtractedRow(id: string) {
    setExtractedRows((rows) => rows.filter((row) => row.id !== id))
  }

  const projectOptions = useMemo(
    () =>
      projectOptionsProp && projectOptionsProp.length > 0
        ? projectOptionsProp
        : context.projects.map((p) => ({ id: p.project.id, name: p.project.name })),
    [projectOptionsProp, context.projects]
  )

  if (!projectId) {
    return (
      <div className={cn('space-y-6', isRtl && 'text-right')}>
        <PageHeader title={t.title} description={t.description} />
        <ErrorBlock message={t.noProject} />
      </div>
    )
  }

  if (loading && !kpis) {
    return <LoadingBlock label={t.title} />
  }

  return (
    <div className={cn('space-y-8', isRtl && 'text-right')} dir={dir}>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          projectOptions.length > 1 ? (
            <Select value={projectId} onValueChange={handleProjectChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={t.selectProject} />
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

      {error ? <ErrorBlock message={error} onRetry={loadData} /> : null}

      {successMessage ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      ) : null}

      {kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t.totalItems} value={kpis.totalItems} icon={Package} />
          <StatCard
            label={t.lowStock}
            value={kpis.lowStockItems}
            icon={AlertCircle}
            trendType={kpis.lowStockItems > 0 ? 'warning' : 'neutral'}
          />
          <StatCard label={t.incomingToday} value={kpis.incomingToday} icon={TrendingUp} trendType="up" />
          <StatCard label={t.outgoingToday} value={kpis.outgoingToday} icon={TrendingDown} trendType="down" />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title={t.stockTable} description={t.emptyStock}>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t.emptyStock}</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className={cn('w-full text-sm', isRtl && 'text-right')}>
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 px-2 font-medium">{t.name}</th>
                    <th className="py-2 px-2 font-medium">{t.currentStock}</th>
                    <th className="py-2 px-2 font-medium">{t.unit}</th>
                    <th className="py-2 px-2 font-medium">{t.minStock}</th>
                    <th className="py-2 px-2 font-medium">{t.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isLow = Number(item.current_stock) < Number(item.min_stock)
                    return (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2.5 px-2 font-medium">{item.name}</td>
                        <td className="py-2.5 px-2">{item.current_stock}</td>
                        <td className="py-2.5 px-2">{item.unit}</td>
                        <td className="py-2.5 px-2">{item.min_stock}</td>
                        <td className="py-2.5 px-2">
                          <Badge variant={isLow ? 'destructive' : 'secondary'}>{isLow ? t.low : t.ok}</Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title={t.transactionsTable} description={t.emptyTransactions}>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t.emptyTransactions}</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className={cn('w-full text-sm', isRtl && 'text-right')}>
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 px-2 font-medium">{t.name}</th>
                    <th className="py-2 px-2 font-medium">{t.type}</th>
                    <th className="py-2 px-2 font-medium">{t.quantity}</th>
                    <th className="py-2 px-2 font-medium">{t.unit}</th>
                    <th className="py-2 px-2 font-medium">{t.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="py-2.5 px-2">{tx.inventory_items?.name ?? '—'}</td>
                      <td className="py-2.5 px-2">
                        <Badge variant={tx.type === 'IN' ? 'default' : 'outline'}>{tx.type}</Badge>
                      </td>
                      <td className="py-2.5 px-2">{tx.quantity}</td>
                      <td className="py-2.5 px-2">{tx.unit}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        {new Date(tx.date).toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <Card className="border-primary/20 shadow-card">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Warehouse className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xl">
                  {transactionType === 'IN' ? t.receiveStock : t.dispatchStock}
                </CardTitle>
                <CardDescription className="mt-1">
                  {transactionType === 'IN' ? t.receiveHint : t.dispatchHint}
                </CardDescription>
              </div>
            </div>
            <div className="flex rounded-lg border p-1 bg-muted/30">
              <Button
                type="button"
                size="sm"
                variant={transactionType === 'IN' ? 'default' : 'ghost'}
                onClick={() => {
                  setTransactionType('IN')
                  resetScanner()
                }}
              >
                {t.stockIn}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={transactionType === 'OUT' ? 'default' : 'ghost'}
                onClick={() => {
                  setTransactionType('OUT')
                  resetScanner()
                }}
              >
                {t.stockOut}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 rounded-xl border bg-muted/20 p-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-date">
                {t.invoiceDate} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invoice-date"
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-number">
                {t.invoiceNumber}{' '}
                <span className="text-muted-foreground font-normal">({t.invoiceNumberOptional})</span>
              </Label>
              <Input
                id="invoice-number"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder={t.invoiceNumberOptional}
                className="h-10"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
            />
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant={entryMode === 'ai' && scanFile ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className={cn('h-4 w-4', isRtl ? 'ml-2' : 'mr-2')} />
              {t.takePhoto}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => uploadInputRef.current?.click()}
            >
              <Upload className={cn('h-4 w-4', isRtl ? 'ml-2' : 'mr-2')} />
              {t.uploadInvoice}
            </Button>
            <Button
              type="button"
              variant={entryMode === 'manual' ? 'default' : 'outline'}
              className="flex-1"
              onClick={startManualEntry}
            >
              <PenLine className={cn('h-4 w-4', isRtl ? 'ml-2' : 'mr-2')} />
              {t.manualEntry}
            </Button>
            {entryMode === 'ai' && scanFile ? (
              <Button type="button" disabled={analyzing} onClick={handleAnalyze}>
                {analyzing ? (
                  <>
                    <Loader2 className={cn('h-4 w-4 animate-spin', isRtl ? 'ml-2' : 'mr-2')} />
                    {t.analyzing}
                  </>
                ) : (
                  t.analyzeWithAi
                )}
              </Button>
            ) : null}
          </div>

          {entryMode === 'manual' ? (
            <p className="text-sm text-muted-foreground">{t.manualHint}</p>
          ) : null}

          {scanPreview ? (
            <div className="rounded-xl border overflow-hidden bg-muted/30 max-w-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={scanPreview} alt="Invoice preview" className="w-full max-h-64 object-contain" />
            </div>
          ) : null}

          {scannerError ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {scannerError}
            </div>
          ) : null}

          {extractedRows.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">{t.itemsToReceive}</h4>
              <div className="overflow-x-auto rounded-xl border">
                <table className={cn('w-full text-sm', isRtl && 'text-right')}>
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="py-2 px-2 font-medium">{t.name}</th>
                      <th className="py-2 px-2 font-medium w-28">{t.quantity}</th>
                      <th className="py-2 px-2 font-medium w-32">{t.unit}</th>
                      <th className="py-2 px-2 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {extractedRows.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="p-2">
                          <Input
                            value={row.name}
                            onChange={(e) => updateExtractedRow(row.id, { name: e.target.value })}
                            className="h-9"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={row.quantity}
                            onChange={(e) =>
                              updateExtractedRow(row.id, { quantity: Number(e.target.value) || 0 })
                            }
                            className="h-9"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={row.unit}
                            onChange={(e) => updateExtractedRow(row.id, { unit: e.target.value })}
                            className="h-9"
                          />
                        </td>
                        <td className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t.deleteRow}
                            onClick={() => removeExtractedRow(row.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => setExtractedRows((r) => [...r, newExtractedRow()])}>
                  <Plus className={cn('h-4 w-4', isRtl ? 'ml-2' : 'mr-2')} />
                  {t.addRow}
                </Button>
                <Button type="button" className="sm:ml-auto" disabled={saving} onClick={handleConfirmSave}>
                  {saving ? (
                    <>
                      <Loader2 className={cn('h-4 w-4 animate-spin', isRtl ? 'ml-2' : 'mr-2')} />
                      {t.saving}
                    </>
                  ) : (
                    transactionType === 'IN' ? t.confirmSave : t.confirmDispatch
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
