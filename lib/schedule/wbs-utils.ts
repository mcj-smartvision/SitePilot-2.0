/** WBS hierarchy helpers for schedule table indentation. */

export function wbsDepth(wbsCode: string | null | undefined): number {
  if (!wbsCode?.trim()) return 0
  return wbsCode.split('.').filter(Boolean).length - 1
}

export function wbsSortKey(wbsCode: string | null | undefined, fallback = ''): string {
  if (!wbsCode?.trim()) return fallback
  return wbsCode
    .split('.')
    .map((part) => part.padStart(6, '0'))
    .join('.')
}

export function compareWbs(a: string | null | undefined, b: string | null | undefined): number {
  return wbsSortKey(a).localeCompare(wbsSortKey(b))
}
