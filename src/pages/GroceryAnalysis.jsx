import { useLocation, useNavigate } from 'react-router-dom'
import { useExpenses } from '../hooks/useExpenses'
import { groceryBreakdown } from '../lib/calc'
import { money, monthLabel } from '../lib/format'
import TopBar from '../components/TopBar'
import { Screen, Stagger, Item } from '../components/motion'

// What's actually in the trolley. Tapping Groceries in Analytics lands here
// instead of just filtering the row below — a category total doesn't tell you
// whether the money went on produce or on takeout-disguised-as-shopping.
export default function GroceryAnalysis() {
  const nav = useNavigate()
  const { state } = useLocation()
  const monthDate = state?.monthDate ? new Date(state.monthDate) : new Date()
  const zone = state?.zone || 'together'

  const { expenses: all, loading } = useExpenses(monthDate)
  const inZone = all.filter((e) => {
    if (zone === 'together') return e.scope === 'shared'
    if (zone === 'mine') return e.scope === 'private'
    return e.scope === 'business'
  })
  const groceryExpenses = inZone.filter((e) => e.category === 'Groceries')
  const rows = groceryBreakdown(groceryExpenses)
  const itemsTotal = rows.reduce((t, r) => t + r.total, 0)
  const receiptsTotal = groceryExpenses.reduce((t, e) => t + Number(e.amount), 0)
  // Not every scan gets itemised — OCR sometimes only reads the total. The gap
  // is real spending too, so it's shown rather than silently dropped.
  const unitemised = Math.max(0, receiptsTotal - itemsTotal)

  return (
    <div className="pb-28">
      <TopBar title="Groceries" subtitle={monthLabel(monthDate)} back />
      <Screen className="mx-auto max-w-md px-4 space-y-4">
        <div className="rounded-xl3 bg-mint-200 p-5 text-center">
          <p className="label mb-0 text-brand-700/70">Spent on groceries</p>
          <p className="figure mt-1 text-brand-700">{money(receiptsTotal)}</p>
          <p className="mt-1 text-sm text-brand-700/70">
            {groceryExpenses.length} shop{groceryExpenses.length === 1 ? '' : 's'} · {rows.length} distinct item{rows.length === 1 ? '' : 's'}
          </p>
        </div>

        {loading && rows.length === 0 && <p className="py-8 text-center text-muted">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="py-10 text-center text-muted">
            No itemised shops yet — scan a grocery receipt and its products will show up here.
          </p>
        )}

        {rows.length > 0 && (
          <Item className="card">
            <h2 className="label">What you bought</h2>
            <Stagger className="divide-y divide-slate-100">
              {rows.map((r) => (
                <Item key={r.name} className="flex items-center justify-between py-2.5">
                  <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                  <span className="shrink-0 text-xs text-muted">×{r.count}</span>
                  <span className="tnum ml-3 shrink-0 font-semibold">{money(r.total)}</span>
                </Item>
              ))}
            </Stagger>
            {unitemised > 0.5 && (
              <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-muted">
                +{money(unitemised)} from shops that weren't itemised.
              </p>
            )}
          </Item>
        )}
      </Screen>
    </div>
  )
}
