'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Tags } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getBlocksForDashboard, UI_BLOCK_BY_CODE, type UiBlockLayer } from '@/lib/dashboard/ui-block-catalog'
import {
  BLOCK_KIND_LABELS_FA,
  isUiBlockVisible,
} from '@/lib/dashboard/resolve-ui-block-visibility'

const LAYER_LABELS_FA: Record<UiBlockLayer, string> = {
  executive: 'لایه ۱ — مدیریتی',
  analytical: 'لایه ۲ — تحلیلی',
  operational: 'عملیاتی',
  general: 'عمومی',
}

interface UiBlockVisibilityContextValue {
  visibleCodes: Set<string> | null
  isVisible: (code: string) => boolean
  showAdminBlockCodes: boolean
}

const UiBlockVisibilityContext = createContext<UiBlockVisibilityContextValue>({
  visibleCodes: null,
  isVisible: (code) => isUiBlockVisible(undefined, code),
  showAdminBlockCodes: false,
})

export function UiBlockVisibilityProvider({
  visibleCodes,
  showAdminBlockCodes = false,
  children,
}: {
  visibleCodes: string[] | Set<string> | null
  showAdminBlockCodes?: boolean
  children: ReactNode
}) {
  const value = useMemo(() => {
    const set =
      visibleCodes instanceof Set ? visibleCodes : visibleCodes ? new Set(visibleCodes) : null
    return {
      visibleCodes: set,
      isVisible: (code: string) => isUiBlockVisible(set ?? undefined, code),
      showAdminBlockCodes,
    }
  }, [visibleCodes, showAdminBlockCodes])

  return (
    <UiBlockVisibilityContext.Provider value={value}>{children}</UiBlockVisibilityContext.Provider>
  )
}

export function useUiBlockVisibility() {
  return useContext(UiBlockVisibilityContext)
}

function AdminUiBlockBadge({ code }: { code: string }) {
  const def = UI_BLOCK_BY_CODE[code]
  if (!def) {
    return (
      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-white shadow-sm">
        {code}
      </span>
    )
  }

  const tooltip = [def.titleFa, def.descriptionFa, `key: ${def.key}`].join('\n')

  return (
    <div
      className="pointer-events-auto absolute top-2 start-2 z-20 flex max-w-[min(100%,20rem)] flex-wrap items-center gap-1"
      title={tooltip}
    >
      <span className="rounded-md bg-violet-700 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wide text-white shadow-md ring-1 ring-violet-900/20">
        {code}
      </span>
      <span className="rounded-md bg-slate-800/85 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
        {BLOCK_KIND_LABELS_FA[def.kind] ?? def.kind}
      </span>
      <span className="rounded-md border border-violet-200 bg-violet-50/95 px-1.5 py-0.5 text-[10px] font-medium text-violet-900 shadow-sm">
        {LAYER_LABELS_FA[def.layer] ?? def.layer}
      </span>
    </div>
  )
}

/** Renders children only when the UI block is visible for the current user. */
export function UiBlockGuard({
  code,
  children,
  fallback = null,
}: {
  code: string
  children: ReactNode
  fallback?: ReactNode
}) {
  const { isVisible, showAdminBlockCodes } = useUiBlockVisibility()
  if (!isVisible(code)) return <>{fallback}</>

  if (!showAdminBlockCodes) return <>{children}</>

  return (
    <div className="relative">
      <AdminUiBlockBadge code={code} />
      {children}
    </div>
  )
}

/** Collapsible catalog index — admin only, top of role dashboards. */
export function AdminUiBlockCatalogPanel({ dashboard }: { dashboard: string }) {
  const { showAdminBlockCodes, isVisible } = useUiBlockVisibility()
  const [open, setOpen] = useState(true)

  const blocks = useMemo(
    () =>
      getBlocksForDashboard(dashboard)
        .filter((b) => b.dashboard === dashboard)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [dashboard]
  )

  const byLayer = useMemo(() => {
    const map = new Map<UiBlockLayer, typeof blocks>()
    for (const block of blocks) {
      const list = map.get(block.layer) ?? []
      list.push(block)
      map.set(block.layer, list)
    }
    return map
  }, [blocks])

  if (!showAdminBlockCodes || blocks.length === 0) return null

  const layerOrder: UiBlockLayer[] = ['executive', 'analytical', 'operational', 'general']

  return (
    <div
      className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/90 to-background shadow-sm"
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Tags className="h-5 w-5 text-violet-700" />
          <div>
            <p className="text-sm font-bold text-violet-950">راهنمای کد بلوک‌ها (فقط ادمین)</p>
            <p className="text-xs text-muted-foreground">
              {blocks.length} بلوک — روی هر بخش badge بنفش با کد (مثل PM-CHT-01) نمایش داده می‌شود
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? (
            <>
              <ChevronUp className="h-4 w-4 me-1" />
              جمع کردن
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 me-1" />
              نمایش فهرست
            </>
          )}
        </Button>
      </div>

      {open ? (
        <div className="space-y-4 p-4">
          {layerOrder.map((layer) => {
            const layerBlocks = byLayer.get(layer)
            if (!layerBlocks?.length) return null
            return (
              <div key={layer}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-800">
                  {LAYER_LABELS_FA[layer]}
                </p>
                <div className="overflow-x-auto rounded-xl border bg-card">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-right text-xs text-muted-foreground">
                        <th className="px-3 py-2 font-medium">کد</th>
                        <th className="px-3 py-2 font-medium">نام فارسی</th>
                        <th className="px-3 py-2 font-medium">نوع</th>
                        <th className="px-3 py-2 font-medium">نمایش</th>
                        <th className="px-3 py-2 font-medium">key</th>
                      </tr>
                    </thead>
                    <tbody>
                      {layerBlocks.map((block) => {
                        const visible = isVisible(block.code)
                        return (
                          <tr key={block.code} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px] bg-violet-50 text-violet-900 border-violet-200"
                              >
                                {block.code}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 font-medium">{block.titleFa}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {BLOCK_KIND_LABELS_FA[block.kind] ?? block.kind}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant={visible ? 'default' : 'secondary'} className="text-[10px]">
                                {visible ? 'فعال' : 'مخفی'}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                              {block.key}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
