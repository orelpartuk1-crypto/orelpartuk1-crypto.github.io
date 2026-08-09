import { money, dayLabel } from '../lib/format'

// The individual expenses behind one category total, shown when you tap it.
export default function MiniExpenseList({ expenses, nameOf, onReceipt }) {
  if (!expenses?.length) return null
  const rows = [...expenses].sort((a, b) => String(b.spent_at).localeCompare(String(a.spent_at)))
  return (
    <ul className="mt-2 space-y-1 rounded-2xl bg-slate-50 p-2">
      {rows.map((e) => {
        const hasReceipt = Boolean(e.receipt_path)
        return (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => hasReceipt && onReceipt?.(e)}
              disabled={!hasReceipt}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm active:bg-slate-100 disabled:active:bg-transparent"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {e.note || e.category}
                  {hasReceipt && <span className="ml-1 text-muted" aria-label="Has a receipt">🧾</span>}
                </p>
                <p className="text-xs text-muted">
                  {dayLabel(e.spent_at)}{nameOf ? ` · ${nameOf(e.paid_by)}` : ''}
                </p>
              </div>
              <span className="shrink-0 font-semibold">{money(e.amount)}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
