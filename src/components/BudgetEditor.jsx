import { useMemo, useState } from 'react'
import { categoryMeta } from '../lib/categories'
import { Tap, Sheet } from './motion'

// Shared by Analytics and Together's own Analysis tab — the two used to
// each carry their own copy of this, which is exactly how the sheet-height
// fix landed on one and not the other. One version now, used by both.
//
// A plain + next to the card's own title, not a full-width button below the
// ring cards — the trigger doesn't need to announce itself, it's obviously
// "add a limit" sitting right where "Shared budgets" already is.
export default function BudgetEditor({ cats, budgetMap, scope, onSet }) {
  const [open, setOpen] = useState(false)
  const options = useMemo(() => {
    const seen = new Set(cats.map((c) => c.category))
    return [...seen, ...Object.keys(budgetMap).filter((k) => !seen.has(k))]
  }, [cats, budgetMap])

  return (
    <>
      <Tap
        onClick={() => setOpen(true)}
        aria-label={`Set ${scope === 'shared' ? 'shared' : 'personal'} limits`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-muted"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </Tap>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <h2 className="text-xl font-bold">{scope === 'shared' ? 'Shared' : 'Personal'} limits</h2>
          {options.length === 0 ? (
            <p className="py-8 text-center text-muted">Log something first, then you can cap it.</p>
          ) : (
            <>
              <p className="text-sm text-muted">Every category paid for this month — cap what matters, leave the rest at 0.</p>
              <div className="space-y-1">
                {options.map((category) => (
                  <LimitRow key={category} category={category} value={budgetMap[category] || 0} onSet={onSet} />
                ))}
              </div>
            </>
          )}
          <button className="btn-primary w-full" onClick={() => setOpen(false)}>Done</button>
        </div>
      </Sheet>
    </>
  )
}

function LimitRow({ category, value, onSet }) {
  const [v, setV] = useState(value ? String(value) : '')
  const m = categoryMeta(category)

  const commit = () => {
    const n = parseFloat((v || '0').replace(',', '.')) || 0
    if (n !== value) onSet(category, n)
  }

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-lg">{m.emoji}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{category}</span>
      <div className="flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-1.5">
        <span className="text-muted">€</span>
        <input
          className="tnum w-16 bg-transparent text-right font-semibold outline-none"
          inputMode="decimal"
          value={v}
          onChange={(e) => setV(e.target.value.replace(/[^0-9.,]/g, ''))}
          onBlur={commit}
          placeholder="0"
        />
      </div>
    </div>
  )
}
