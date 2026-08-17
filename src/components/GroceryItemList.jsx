import { groceryBreakdown } from '../lib/calc'
import { money } from '../lib/format'

// What was actually bought under Groceries, not the shopping trips — every
// purchase of the same item (steak, chicken, ...) merged into one line and
// the whole list ranked most expensive first, same rule GroceryAnalysis uses.
export default function GroceryItemList({ expenses }) {
  const rows = groceryBreakdown(expenses)
  if (rows.length === 0) return null

  return (
    <ul className="mt-2 space-y-1 rounded-2xl bg-slate-50 p-2">
      {rows.map((r) => (
        <li key={r.name} className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm">
          <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
          <span className="shrink-0 text-xs text-muted">×{r.count}</span>
          <span className="tnum shrink-0 font-semibold">{money(r.total)}</span>
        </li>
      ))}
    </ul>
  )
}
