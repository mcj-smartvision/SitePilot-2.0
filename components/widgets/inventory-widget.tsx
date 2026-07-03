'use client'

import type { WidgetRenderContext } from '@/types/dashboard'
import { WidgetShell } from '@/components/widgets/widget-shell'
import { Button } from '@/components/ui/button'

const SAMPLE_STOCK = [
  { item: 'Rebar 16mm', qty: '2.4 t', status: 'Low' },
  { item: 'Portland Cement', qty: '180 bags', status: 'OK' },
  { item: 'Formwork panels', qty: '42 units', status: 'OK' },
  { item: 'Safety harnesses', qty: '6 units', status: 'Critical' },
]

export function InventoryWidget({ context }: { context: WidgetRenderContext }) {
  return (
    <WidgetShell
      title="Inventory & Stock"
      description="Material receiving and on-site stock levels"
      action={<Button size="sm" variant="outline">Receive</Button>}
    >
      {!context.projectId ? (
        <p className="text-sm text-muted-foreground">No project selected.</p>
      ) : (
        <ul className="space-y-2">
          {SAMPLE_STOCK.map((row) => (
            <li key={row.item} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>{row.item}</span>
              <span className="text-muted-foreground">{row.qty}</span>
              <StatusPill status={row.status} />
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'Critical' ? 'bg-red-100 text-red-800' :
    status === 'Low' ? 'bg-amber-100 text-amber-800' :
    'bg-emerald-100 text-emerald-800'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{status}</span>
}
