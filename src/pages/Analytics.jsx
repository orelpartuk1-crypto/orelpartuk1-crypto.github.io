import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { useExpenses } from '../hooks/useExpenses'
import { useMoney } from '../hooks/useMoney'
import { useBudgets } from '../hooks/useBudgets'
import { useHistory } from '../hooks/useHistory'
import { useRecurring } from '../hooks/useRecurring'
import { byCategory, summarize, budgetStatus, vsLastMonth, onlySpending } from '../lib/calc'
import { monthlyTotals } from '../lib/coach'
import { categoryMeta } from '../lib/categories'
import { money, monthLabel } from '../lib/format'
import TopBar from '../components/TopBar'
import Donut from '../components/Donut'
import Ring from '../components/Ring'
import TrendChart from '../components/TrendChart'
import MiniExpenseList from '../components/MiniExpenseList'
import GroceryItemList from '../components/GroceryItemList'
import CoachInsights from '../components/CoachInsights'
import ReceiptViewer from '../components/ReceiptViewer'
import SkeletonRows from '../components/SkeletonRows'
import BudgetEditor from '../components/BudgetEditor'
import { Screen, Item, Stagger, Tap, Counter, Sheet } from '../components/motion'

const isThisMonth = (d) => {
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
}

// One screen that answers "where did it go", for whichever slice of money you
// mean. The zone toggle matches the dashboard's, so the two never disagree.
export default function Analytics() {
  const { user, members, hasBusiness } = useAuth()
  const [monthDate, setMonthDate] = useState(new Date())
  const prevMonthDate = useMemo(
    () => new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1),
    [monthDate]
  )

  const { expenses: all, loading } = useExpenses(monthDate)
  const { expenses: prevAll } = useExpenses(prevMonthDate)
  const { bonuses } = useMoney(monthDate)
  const { shared: sharedBudgets, personal: personalBudgets, set: setBudget } = useBudgets()
  const { rows: history, loading: historyLoading } = useHistory(6)
  const { notSpending } = useCategories()
  const { items: recurringItems } = useRecurring()

  // Arriving from the Together screen should land on shared, not on whatever
  // zone was last used somewhere else. Arriving with `lock` pins it there for
  // good — the whole point of "our analysis" is that it never drifts into
  // personal or business territory.
  const [params] = useSearchParams()
  const locked = params.get('lock') === '1'
  // Shared isn't one of the tabs you can switch to here any more — Together
  // already owns that view with its own Analysis tab, and having the same
  // "shared" picture reachable two ways just meant fixing one and forgetting
  // the other. Landing here fresh (no saved zone yet, or a zone from before
  // this changed) goes to Mine instead. The locked drill-down Together links
  // out to for Needs/Treats is unaffected — it always passes `zone=together`
  // explicitly and hides this switcher entirely.
  const [zone, setZone] = useState(() => params.get('zone') || localStorage.getItem('db_zone') || 'mine')
  const persistZone = (z) => {
    setZone(z)
    localStorage.setItem('db_zone', z)
    // The Out/In toggle only exists in Mine and Business. Leaving both for
    // Together — which has no income concept — would strand you looking at
    // income with no way back.
    if (z !== 'mine' && z !== 'business') setDirection('out')
    setOpenCat(null)
    setSpendFilter(null)
  }
  const activeZone = !locked && (zone === 'together' || (zone === 'business' && !hasBusiness)) ? 'mine' : zone

  // A "need" or "treat" slice, requested by the Together screen — a whole
  // separate view built out of the same data rather than a fourth screen.
  const filterType = params.get('filter') === 'need' || params.get('filter') === 'treat' ? params.get('filter') : null

  const [direction, setDirection] = useState('out') // 'out' | 'in'
  const [openCat, setOpenCat] = useState(null)
  const [receipt, setReceipt] = useState(null)
  // Needs/treats folded into the donut card itself instead of a separate
  // card below it — tapping either re-slices the same donut and list rather
  // than opening yet another view of the same month. A single mark slides
  // between the two (one tap moves it, it never toggles off on its own) —
  // double-tapping the active one is what actually clears it.
  const [spendFilter, setSpendFilter] = useState(null) // 'need' | 'treat' | null
  const pickSpendFilter = (v) => {
    setSpendFilter(v)
    setOpenCat(null)
  }
  const clearSpendFilter = () => setSpendFilter(null)

  const shiftMonth = (d) => setMonthDate((m) => new Date(m.getFullYear(), m.getMonth() + d, 1))
  const atCurrentMonth = isThisMonth(monthDate)
  const nameOf = (id) => (id === user?.id ? 'You' : members.find((m) => m.id === id)?.display_name || '—')

  const sliceOf = (rows) =>
    rows.filter((e) => {
      if (activeZone === 'together' && e.scope !== 'shared') return false
      if (activeZone === 'mine' && !(e.scope === 'private' && e.paid_by === user?.id)) return false
      if (activeZone === 'business' && !(e.scope === 'business' && e.paid_by === user?.id)) return false
      if (filterType && e.spend_type !== filterType) return false
      return true
    })

  const expenses = useMemo(() => onlySpending(sliceOf(all), notSpending), [all, activeZone, user?.id, notSpending, filterType])
  const prevExpenses = useMemo(() => onlySpending(sliceOf(prevAll), notSpending), [prevAll, activeZone, user?.id, notSpending, filterType])

  // Income has no real "shared" concept, but it does split into personal vs
  // business — there's no scope column on incomes, so a bonus_type of
  // "Business…" (the presets logging income already offers: Business,
  // Business – product, Business – service) is the signal. Mine gets
  // everything that isn't tagged business; Business gets only what is.
  const myIncomeRows = useMemo(
    () =>
      bonuses.filter((b) => {
        if (b.owner !== user?.id) return false
        const isBusiness = (b.bonus_type || '').toLowerCase().startsWith('business')
        return activeZone === 'business' ? isBusiness : !isBusiness
      }),
    [bonuses, user?.id, activeZone]
  )
  const showingIncome = direction === 'in'

  const cats = useMemo(
    () =>
      showingIncome
        ? Object.entries(
            myIncomeRows.reduce((acc, b) => {
              const k = b.bonus_type || 'Other'
              acc[k] = (acc[k] || 0) + Number(b.amount)
              return acc
            }, {})
          )
            .map(([category, total]) => ({ category, total }))
            .sort((a, b) => b.total - a.total)
        : byCategory(expenses),
    [showingIncome, myIncomeRows, expenses]
  )

  const total = cats.reduce((t, c) => t + c.total, 0)
  const totals = summarize(expenses)
  const pace = useMemo(() => vsLastMonth(expenses, prevExpenses), [expenses, prevExpenses])

  // The donut + list re-slice to just Needs or just Treats when one is
  // tapped below — same category shape, a different (smaller) total.
  const displayCats = useMemo(() => {
    if (showingIncome || !spendFilter) return cats
    return byCategory(expenses.filter((e) => e.spend_type === spendFilter))
  }, [showingIncome, spendFilter, cats, expenses])
  const displayTotal = displayCats.reduce((t, c) => t + c.total, 0)

  // Shared spending is measured against the joint budget; anything personal
  // against your own. Business has no budget concept.
  const budgetScope = activeZone === 'together' ? 'shared' : activeZone === 'mine' ? 'private' : null
  const budgetMap = budgetScope === 'shared' ? sharedBudgets : budgetScope === 'private' ? personalBudgets : {}
  const budgeted = cats.filter((c) => (budgetMap[c.category] || 0) > 0)
  const budgetRows = useMemo(
    () => Object.entries(budgetMap).map(([category, monthly_limit]) => ({ category, monthly_limit })),
    [budgetMap]
  )

  // Raw rows for the zone, several months back — the trend chart aggregates
  // these into monthly bars; CoachInsights uses the same slice, unaggregated,
  // to spot a genuine multi-month streak rather than just this-vs-last.
  const zoneHistory = useMemo(
    () =>
      history.filter((e) => {
        if (activeZone === 'together') return e.scope === 'shared'
        if (activeZone === 'mine') return e.scope === 'private' && e.paid_by === user?.id
        return e.scope === 'business' && e.paid_by === user?.id
      }),
    [history, activeZone, user?.id]
  )
  const trend = useMemo(() => monthlyTotals(zoneHistory, { months: 6 }), [zoneHistory])

  const zones = [
    { key: 'mine', label: '🔒 Mine' },
    ...(hasBusiness ? [{ key: 'business', label: '💼 Business' }] : []),
  ]

  const selectCategory = (label) => setOpenCat(label)

  return (
    <div className="pb-28">
      <TopBar
        title={filterType === 'need' ? 'Needs' : filterType === 'treat' ? 'Treats' : 'Analytics'}
        subtitle={filterType === 'need' ? 'What you had to spend, together' : filterType === 'treat' ? 'What you chose to spend, together' : 'Where it went'}
        back={locked}
        right={
          <Link to="/movements" className="flex h-10 items-center gap-1.5 rounded-full bg-white px-3 font-medium text-brand-600 shadow-card active:scale-95">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
            </svg>
            All
          </Link>
        }
      />
      <Screen className="mx-auto max-w-md px-4 space-y-4">
        <div className="flex items-center justify-between">
          <Tap onClick={() => shiftMonth(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card" aria-label="Previous month">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </Tap>
          <span className="rounded-full bg-white px-6 py-2.5 font-semibold shadow-card">{monthLabel(monthDate)}</span>
          <Tap onClick={() => !atCurrentMonth && shiftMonth(1)} disabled={atCurrentMonth} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card disabled:opacity-30" aria-label="Next month">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </Tap>
        </div>

        {!locked && (
          <div className="flex rounded-full bg-black/[0.04] p-1">
            {zones.map((z) => (
              <Tap key={z.key} onClick={() => persistZone(z.key)}
                className={`flex-1 rounded-full py-2.5 text-sm font-semibold ${activeZone === z.key ? 'bg-white text-ink shadow-card' : 'text-muted'}`}>
                {z.label}
              </Tap>
            ))}
          </div>
        )}

        {/* Donut */}
        <Item className="card">
          {/* One hero number, not two — this used to repeat the same total
              a second time in the donut's own center the moment it loaded. */}
          <div className="flex items-start justify-between">
            <p className="label mb-0">{showingIncome ? 'Income' : 'Expenses'} by {showingIncome ? 'source' : 'category'}</p>
            {(activeZone === 'mine' || activeZone === 'business') && (
              <div className="flex rounded-full bg-black/[0.04] p-1 text-xs">
                {[{ k: 'out', l: 'Out' }, { k: 'in', l: 'In' }].map((o) => (
                  <Tap key={o.k} onClick={() => { setDirection(o.k); setOpenCat(null); setSpendFilter(null) }}
                    className={`rounded-full px-3 py-1.5 font-semibold ${direction === o.k ? `bg-white shadow-card ${o.k === 'in' ? 'text-earn' : 'text-spend'}` : 'text-muted'}`}>
                    {o.l}
                  </Tap>
                ))}
              </div>
            )}
          </div>

          {loading && cats.length === 0 && <SkeletonRows />}
          {!loading && cats.length === 0 && (
            <p className="py-8 text-center text-muted">Nothing here for {monthLabel(monthDate)}.</p>
          )}

          {cats.length > 0 && (
            <>
              <div className="my-4 flex justify-center">
                <Donut
                  size={190}
                  stroke={26}
                  data={displayCats.map((c) => ({ label: c.category, value: c.total, color: categoryMeta(c.category).color }))}
                  total={displayTotal}
                  selected={openCat}
                  onSelect={(label) => selectCategory(label)}
                  center={
                    <>
                      <span className="text-xs text-muted">{openCat || (spendFilter ? (spendFilter === 'need' ? '🧺 needs' : '🍦 treats') : 'total')}</span>
                      <span className={`tnum text-2xl font-bold ${!openCat && !showingIncome ? 'text-spend' : !openCat ? 'text-earn' : ''}`}>
                        <Counter
                          id="analytics-donut"
                          ready={!loading}
                          value={openCat ? (displayCats.find((c) => c.category === openCat)?.total ?? 0) : displayTotal}
                          format={(n) => money(n)}
                        />
                      </span>
                      {openCat && displayTotal > 0 && (
                        <span className="text-xs text-muted">
                          {Math.round(((displayCats.find((c) => c.category === openCat)?.total ?? 0) / displayTotal) * 100)}%
                        </span>
                      )}
                    </>
                  }
                />
              </div>

              {/* Tapping a category opens its own analysis below, rather than
                  narrowing this same list down to one row. */}
              <Stagger className="divide-y divide-slate-100">
                {displayCats.map(({ category, total: t }) => {
                  const m = categoryMeta(category)
                  const share = displayTotal > 0 ? Math.round((t / displayTotal) * 100) : 0
                  const p = pace[category]
                  return (
                    <Item key={category} className="py-2">
                      <Tap
                        onClick={() => !showingIncome && selectCategory(category)}
                        disabled={showingIncome}
                        className="flex w-full items-center gap-2.5 text-left disabled:active:scale-100"
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: m.color }} />
                        <span className="min-w-0 flex-1 truncate font-medium">{category}</span>
                        <span className="tnum shrink-0 text-sm text-muted">{share}%</span>
                        <span className="tnum shrink-0 font-semibold">{money(t)}</span>
                        {!showingIncome && <span className="shrink-0 text-muted">›</span>}
                      </Tap>
                      {p && (
                        <p className={`mt-0.5 pl-5 text-xs font-medium ${p.status === 'over' ? 'text-spend' : 'text-amber-600'}`}>
                          {p.status === 'over'
                            ? `Past last month's ${money(p.prev)}`
                            : `${money(p.left)} left before last month's ${money(p.prev)}`}
                        </p>
                      )}
                    </Item>
                  )
                })}
              </Stagger>

              {/* Needs vs treats, folded into this same card — tapping
                  either re-slices the donut and list above instead of
                  opening a whole separate card just to show the same split
                  another way. One mark slides between the two, same muted
                  color for both rather than a green one and an amber one —
                  this is a single toggle, not two unrelated buttons. Tap
                  the active side again (or double-tap) to clear it. */}
              {!showingIncome && !filterType && activeZone !== 'business' && totals.total > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex h-2.5 w-full gap-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out" style={{ width: `${(totals.needs / totals.total) * 100}%` }} />
                    <div className="h-full flex-1 rounded-full bg-amber-400" />
                  </div>
                  <div className="mt-2 flex rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.06]">
                    <Tap
                      onClick={() => pickSpendFilter('need')}
                      onDoubleClick={clearSpendFilter}
                      className={`flex-1 rounded-full py-1.5 text-center text-sm font-semibold ${spendFilter === 'need' ? 'bg-white text-amber-700 shadow-card' : 'text-muted'}`}
                    >
                      🧺 {money(totals.needs)}
                    </Tap>
                    <Tap
                      onClick={() => pickSpendFilter('treat')}
                      onDoubleClick={clearSpendFilter}
                      className={`flex-1 rounded-full py-1.5 text-center text-sm font-semibold ${spendFilter === 'treat' ? 'bg-white text-amber-700 shadow-card' : 'text-muted'}`}
                    >
                      🍦 {money(totals.treats)}
                    </Tap>
                  </div>
                </div>
              )}
            </>
          )}
        </Item>

        {/* Budgets */}
        {budgetScope && !showingIncome && (
          <Item className="card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="label mb-0">{budgetScope === 'shared' ? 'Shared budgets' : 'Your budgets'}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">
                  {budgetScope === 'shared' ? 'Both of you see these' : 'Only you see these'}
                </span>
                <BudgetEditor
                  cats={cats}
                  budgetMap={budgetMap}
                  scope={budgetScope}
                  onSet={(category, limit) => setBudget(category, limit, budgetScope)}
                />
              </div>
            </div>

            {budgeted.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                No limits set for {budgetScope === 'shared' ? 'shared' : 'your private'} spending yet.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {budgeted.map(({ category, total: t }) => {
                  const limit = budgetMap[category]
                  const st = budgetStatus(t, limit)
                  const m = categoryMeta(category)
                  const color = st.status === 'over' ? '#d24a3c' : st.status === 'warn' ? '#b06a12' : m.color
                  return (
                    <div key={category} className="rounded-2xl bg-slate-50 p-4 text-center">
                      <div className="flex justify-center">
                        <Ring ratio={st.ratio} color={color} size={84} stroke={8}>
                          <span className="text-2xl">{m.emoji}</span>
                        </Ring>
                      </div>
                      <p className="mt-3 text-sm font-semibold leading-tight">{category}</p>
                      <p className="tnum mt-1 text-base">
                        <span className={st.status === 'over' ? 'font-bold text-spend' : 'font-bold text-ink'}>{money(t)}</span>
                        <span className="text-muted"> / {money(limit)}</span>
                      </p>
                      <p className={`tnum mt-0.5 text-sm ${st.status === 'over' ? 'font-medium text-spend' : 'text-muted'}`}>
                        {st.status === 'over' ? `${money(t - limit)} over` : `${money(limit - t)} left`}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </Item>
        )}

        {/* Inline rather than its own page — and, same as the needs-vs-treats
            split above, skipped inside an already-narrowed needs/treats slice
            where "what's worth knowing" is just repeating the filter. */}
        {!filterType && !showingIncome && (
          <CoachInsights thisMonth={expenses} lastMonth={prevExpenses} budgets={budgetRows} summary={totals} history={zoneHistory} />
        )}

        {/* What repeats every month, in whichever direction is being shown */}
        {(() => {
          const kind = showingIncome ? 'income' : 'expense'
          const rows = recurringItems.filter((r) => r.active && r.kind === kind)
          const wantScope = activeZone === 'together' ? 'shared' : activeZone === 'mine' ? 'private' : 'business'
          // Recurring income has no scope column, same as one-off income —
          // the source it was logged under ("Business", "Business – product"…)
          // is the only signal, same heuristic as the donut above.
          let scoped =
            kind === 'expense'
              ? rows.filter((r) => r.scope === wantScope)
              : rows.filter((r) => {
                  const isBusiness = (r.source || '').toLowerCase().startsWith('business')
                  return activeZone === 'business' ? isBusiness : !isBusiness
                })
          if (filterType && kind === 'expense') scoped = scoped.filter((r) => r.spend_type === filterType)
          const monthly = scoped.reduce((t, r) => t + Number(r.amount || 0), 0)
          return (
            <Item className="card">
              <div className="flex items-baseline justify-between">
                <h2 className="label mb-0">Every month</h2>
                <span className={`tnum font-bold ${showingIncome ? 'text-earn' : 'text-spend'}`}>{money(monthly)}</span>
              </div>
              {scoped.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  Nothing repeating here yet. Tick “Repeats monthly” when you add something.
                </p>
              ) : (
                <Stagger className="divide-y divide-slate-100">
                  {scoped.map((r) => {
                    const m = categoryMeta(r.category)
                    return (
                      <Item key={r.id} className="flex items-center gap-3 py-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base" style={{ backgroundColor: m.color + '22' }}>
                          {showingIncome ? '💰' : m.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{r.name}</span>
                          <span className="block text-xs text-muted">{r.category || r.source || 'Monthly'}</span>
                        </span>
                        <span className="tnum shrink-0 font-semibold">{money(r.amount)}</span>
                      </Item>
                    )
                  })}
                </Stagger>
              )}
              <Link to="/recurring" className="mt-2 block text-sm font-semibold text-brand-600">Manage →</Link>
            </Item>
          )
        })()}

        {/* Six-month trend — a skeleton in its place while it loads instead
            of the card just not existing yet, which read as the chart
            hanging rather than as data still on its way in. */}
        {historyLoading && trend.length <= 1 && (
          <div className="card">
            <h2 className="label">Last 6 months</h2>
            <div className="flex h-[150px] items-end gap-2 pb-[22px]">
              {[40, 65, 50, 80, 60, 90].map((h, i) => (
                <div key={i} className="flex-1 animate-pulse rounded-lg bg-slate-100" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        )}
        {trend.length > 1 && (
          <Item className="card">
            <h2 className="label">Last 6 months</h2>
            <TrendChart data={trend} />
          </Item>
        )}
      </Screen>

      {receipt && <ReceiptViewer expense={receipt} onClose={() => setReceipt(null)} />}

      {/* Capped around half the screen — a category with a long history
          of purchases used to open as a nearly full-screen sheet, which
          felt like leaving Analytics rather than glancing at one number's
          detail. It still scrolls internally past that. */}
      <Sheet open={!!openCat && !showingIncome} onClose={() => setOpenCat(null)} className="!max-h-[55vh]">
        {openCat && (() => {
          const m = categoryMeta(openCat)
          const t = displayCats.find((c) => c.category === openCat)?.total ?? 0
          const share = displayTotal > 0 ? Math.round((t / displayTotal) * 100) : 0
          const p = pace[openCat]
          const catExpenses = expenses.filter((e) => e.category === openCat && (!spendFilter || e.spend_type === spendFilter))
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl" style={{ backgroundColor: m.color + '22' }}>
                  {m.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-bold">{openCat}</h2>
                  <p className="text-sm text-muted">{share}% of {monthLabel(monthDate)}</p>
                </div>
                <span className="tnum shrink-0 text-lg font-bold">{money(t)}</span>
              </div>
              {p && (
                <p className={`text-sm font-medium ${p.status === 'over' ? 'text-spend' : 'text-amber-600'}`}>
                  {p.status === 'over'
                    ? `Past last month's ${money(p.prev)}`
                    : `${money(p.left)} left before last month's ${money(p.prev)}`}
                </p>
              )}
              {openCat === 'Groceries' ? (
                <GroceryItemList expenses={catExpenses} />
              ) : (
                <MiniExpenseList
                  expenses={catExpenses}
                  nameOf={nameOf}
                  onReceipt={(raw) => { setOpenCat(null); setReceipt(raw) }}
                />
              )}
            </div>
          )
        })()}
      </Sheet>
    </div>
  )
}
