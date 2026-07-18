'use client'

export function FieldStateBadge({ state }: { state?: string }) {
  const s = (state ?? 'MISSING').toUpperCase()
  const tone =
    s === 'VALID'
      ? 'bg-emerald-100 text-emerald-800'
      : s === 'MISSING'
        ? 'bg-slate-100 text-slate-700'
        : s === 'UNUSABLE'
          ? 'bg-amber-100 text-amber-900'
          : 'bg-rose-100 text-rose-800'
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>{s}</span>
  )
}
