'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ChevronDown, ChevronUp, LayoutGrid, Loader2, Tags } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getBlocksForDashboard, UI_BLOCK_BY_CODE, type UiBlockLayer } from '@/lib/dashboard/ui-block-catalog'
import { cn } from '@/lib/utils'
import { useSupabase } from '@/hooks/useSupabase'
import { upsertMemberUiBlockPreference } from '@/lib/dashboard/member-ui-block-preferences'
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
  canCustomize: boolean
  dashboard: string | null
  projectId: string | null
  toggleBlock: (code: string, visible: boolean) => Promise<void>
  togglingCode: string | null
  toggleError: string | null
  clearToggleError: () => void
}

const UiBlockVisibilityContext = createContext<UiBlockVisibilityContextValue>({
  visibleCodes: null,
  isVisible: (code) => isUiBlockVisible(undefined, code),
  showAdminBlockCodes: false,
  canCustomize: false,
  dashboard: null,
  projectId: null,
  toggleBlock: async () => {},
  togglingCode: null,
  toggleError: null,
  clearToggleError: () => {},
})

export function UiBlockVisibilityProvider({
  visibleCodes: initialVisibleCodes,
  showAdminBlockCodes = false,
  dashboard = null,
  projectId = null,
  children,
}: {
  visibleCodes: string[] | Set<string> | null
  showAdminBlockCodes?: boolean
  dashboard?: string | null
  projectId?: string | null
  children: ReactNode
}) {
  const supabase = useSupabase()
  const [visibleCodes, setVisibleCodes] = useState<Set<string> | null>(() => {
    if (initialVisibleCodes instanceof Set) return initialVisibleCodes
    if (initialVisibleCodes) return new Set(initialVisibleCodes)
    return null
  })
  const [togglingCode, setTogglingCode] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)

  const canCustomize = Boolean(dashboard && projectId)

  const toggleBlock = useCallback(
    async (code: string, visible: boolean) => {
      if (!dashboard || !projectId) return

      setToggleError(null)
      setVisibleCodes((prev) => {
        const next = new Set(prev ?? [])
        if (visible) next.add(code)
        else next.delete(code)
        return next
      })

      setTogglingCode(code)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('لطفاً دوباره وارد شوید')

        await upsertMemberUiBlockPreference(supabase, {
          userId: user.id,
          projectId,
          dashboard,
          blockCode: code,
          isVisible: visible,
        })
      } catch (err) {
        setVisibleCodes((prev) => {
          const next = new Set(prev ?? [])
          if (visible) next.delete(code)
          else next.add(code)
          return next
        })
        setToggleError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود')
      } finally {
        setTogglingCode(null)
      }
    },
    [dashboard, projectId, supabase]
  )

  const clearToggleError = useCallback(() => setToggleError(null), [])

  const value = useMemo(
    () => ({
      visibleCodes,
      isVisible: (code: string) => isUiBlockVisible(visibleCodes ?? undefined, code),
      showAdminBlockCodes,
      canCustomize,
      dashboard,
      projectId,
      toggleBlock,
      togglingCode,
      toggleError,
      clearToggleError,
    }),
    [
      visibleCodes,
      showAdminBlockCodes,
      canCustomize,
      dashboard,
      projectId,
      toggleBlock,
      togglingCode,
      toggleError,
      clearToggleError,
    ]
  )

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

/** Personal dashboard layout panel — available to all members on role dashboards. */
export function UiBlockCustomizePanel() {
  const {
    showAdminBlockCodes,
    isVisible,
    canCustomize,
    dashboard,
    toggleBlock,
    togglingCode,
    toggleError,
    clearToggleError,
  } = useUiBlockVisibility()
  const [open, setOpen] = useState(false)

  const blocks = useMemo(() => {
    if (!dashboard) return []
    return getBlocksForDashboard(dashboard)
      .filter((b) => b.dashboard === dashboard)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [dashboard])

  const byLayer = useMemo(() => {
    const map = new Map<UiBlockLayer, typeof blocks>()
    for (const block of blocks) {
      const list = map.get(block.layer) ?? []
      list.push(block)
      map.set(block.layer, list)
    }
    return map
  }, [blocks])

  if (!canCustomize || blocks.length === 0) return null

  const layerOrder: UiBlockLayer[] = ['executive', 'analytical', 'operational', 'general']
  const visibleCount = blocks.filter((b) => isVisible(b.code)).length

  return (
    <div
      className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50/90 to-background shadow-sm"
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {showAdminBlockCodes ? (
            <Tags className="h-5 w-5 text-violet-700" />
          ) : (
            <LayoutGrid className="h-5 w-5 text-violet-700" />
          )}
          <div>
            <p className="text-sm font-bold text-violet-950">
              {showAdminBlockCodes ? 'راهنمای کد بلوک‌ها + شخصی‌سازی' : 'شخصی‌سازی داشبورد من'}
            </p>
            <p className="text-xs text-muted-foreground">
              {visibleCount} از {blocks.length} بخش فعال — بلوک‌های غیرضروری را خاموش کنید تا داشبورد خلوت‌تر شود
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
              تنظیم بلوک‌ها
            </>
          )}
        </Button>
      </div>

      {open ? (
        <div className="space-y-4 p-4">
          {toggleError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-center justify-between gap-2">
              <span>{toggleError}</span>
              <Button type="button" variant="ghost" size="sm" onClick={clearToggleError}>
                بستن
              </Button>
            </div>
          ) : null}
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
                        <th className="px-3 py-2 font-medium w-16">نمایش</th>
                        {showAdminBlockCodes ? (
                          <th className="px-3 py-2 font-medium">کد</th>
                        ) : null}
                        <th className="px-3 py-2 font-medium">نام بخش</th>
                        <th className="px-3 py-2 font-medium">نوع</th>
                        {showAdminBlockCodes ? (
                          <th className="px-3 py-2 font-medium">key</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {layerBlocks.map((block) => {
                        const visible = isVisible(block.code)
                        const busy = togglingCode === block.code
                        return (
                          <tr key={block.code} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center">
                                {busy ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={visible}
                                    aria-label={block.titleFa}
                                    disabled={busy}
                                    onClick={() => void toggleBlock(block.code, !visible)}
                                    className={cn(
                                      'h-5 w-5 rounded border flex items-center justify-center transition-colors',
                                      visible
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-input bg-background hover:bg-muted'
                                    )}
                                  >
                                    {visible ? (
                                      <span className="text-xs leading-none">✓</span>
                                    ) : null}
                                  </button>
                                )}
                              </div>
                            </td>
                            {showAdminBlockCodes ? (
                              <td className="px-3 py-2">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[10px] bg-violet-50 text-violet-900 border-violet-200"
                                >
                                  {block.code}
                                </Badge>
                              </td>
                            ) : null}
                            <td className="px-3 py-2 font-medium">{block.titleFa}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {BLOCK_KIND_LABELS_FA[block.kind] ?? block.kind}
                            </td>
                            {showAdminBlockCodes ? (
                              <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                                {block.key}
                              </td>
                            ) : null}
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

/** @deprecated Use UiBlockCustomizePanel */
export const AdminUiBlockCatalogPanel = UiBlockCustomizePanel
