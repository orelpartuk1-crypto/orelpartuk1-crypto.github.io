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
  const [zone, setZone] = useState(() => params.get('zone') || localStorage.getItem('db_zone') || 'together')
  const persistZone = (z) => {
    setZone(z)
    localStorage.setItem('db_zone', z)
    // The Out/In toggle only exists in the personal zone. Leaving it while
    // showing income would strand you looking at income with no way back.
    if (z !== 'mine') setDirection('out')
    setOpenCat(null)
  }
  const activeZone = zone === 'business' && !hasBusiness ? 'together' : zone

  // A "need" or "treat" slice, requested by the Together screen — a whole
  // separate view built out of the same data rather than a fourth screen.
  const filterType = params.get('filter') === 'need' || params.get('filter') === 'treat' ? params.get('filter') : null

  const [direction, setDirection] = useState('out') // 'out' | 'in'
  const [openCat, setOpenCat] = useState(null)
  const [receipt, setReceipt] = useState(null)

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

  // Income is personal by nature — there is no shared income — so the toggle
  // only offers it where it means something.
  const myIncomeRows = useMemo(
    () => bonuses.filter((b) => b.owner === user?.id),
    [bonuses, user?.id]
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

  // Shared spending is measured against the joint budget; anything personal
  // against your own. Business has no budget concept.
  const budgetScope = activeZone === 'together' ? 'shared' : activeZone === 'mine' ? 'private' : null
  const budgetMap = budgetScope === 'shared' ? sharedBudgets : budgetScope === 'private' ? personalBudgets : {}
  const budgeted = cats.filter((c) => (budgetMap[c.category] || 0) > 0)
  const budgetRows = useMemo(
    () => Object.entries(budgetMap).map(([category, monthly_limit]) => ({ category, monthly_limit })),
    [budgetMap]
  )

  const trend = useMemo(() => {
    const slice = history.filter((e) => {
      if (activeZone === 'together') return e.scope === 'shared'
      if (activeZone === 'mine') return e.scope === 'private' && e.paid_by === user?.id
      return e.scope === 'business' && e.paid_by === user?.id
    })
    return monthlyTotals(slice, { months: 6 })
  }, [history, activeZone, user?.id])

  const zones = [
    { key: 'together', label: '👫 Shared' },
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
              <button key={z.key} onClick={() => persistZone(z.key)}
                className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all duration-200 ${activeZone === z.key ? 'bg-white text-ink shadow-card' : 'text-muted'}`}>
                {z.label}
              </button>
            ))}
          </div>
        )}

        {/* Donut */}
        <Item className="card">
          {/* One hero number, not two — this used to repeat the same total
              a second time in the donut's own center the moment it loaded. */}
          <div className="flex items-start justify-between">
            <p className="label mb-0">{showingIncome ? 'Income' : 'Expenses'} by {showingIncome ? 'source' : 'category'}</p>
            {activeZone === 'mine' && (
              <div className="flex rounded-full bg-black/[0.04] p-1 text-xs">
                {[{ k: 'out', l: 'Out' }, { k: 'in', l: 'In' }].map((o) => (
                  <button key={o.k} onClick={() => { setDirection(o.k); setOpenCat(null) }}
                    className={`rounded-full px-3 py-1.5 font-semibold transition-all duration-200 ${direction === o.k ? `bg-white shadow-card ${o.k === 'in' ? 'text-earn' : 'text-spend'}` : 'text-muted'}`}>
                    {o.l}
                  </button>
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
                  stroke={24}
                  data={cats.map((c) => ({ label: c.category, value: c.total, color: categoryMeta(c.category).color }))}
                  total={total}
                  selected={openCat}
                  onSelect={(label) => selectCategory(label)}
                  center={
                    <>
                      <span className="text-xs text-muted">{openCat || 'total'}</span>
                      <span className={`tnum text-2xl font-bold ${!openCat && !showingIncome ? 'text-spend' : !openCat ? 'text-earn' : ''}`}>
                        <Counter
                          id="analytics-donut"
                          ready={!loading}
                          value={openCat ? (cats.find((c) => c.category === openCat)?.total ?? 0) : total}
                          format={(n) => money(n)}
                        />
                      </span>
                      {openCat && total > 0 && (
                        <span className="text-xs text-muted">
                          {Math.round(((cats.find((c) => c.category === openCat)?.total ?? 0) / total) * 100)}%
                        </span>
                      )}
                    </>
                  }
                />
              </div>

              {/* Tapping a category opens its own analysis below, rather than
                  narrowing this same list down to one row. */}
              <Stagger className="divide-y divide-slate-100">
                {cats.map(({ category, total: t }) => {
                  const m = categoryMeta(category)
                  const share = total > 0 ? Math.round((t / total) * 100) : 0
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
            </>
          )}
        </Item>

        {/* Needs vs treats — only meaningful for spending, and redundant once
            this view is already narrowed to one of the two */}
        {!showingIncome && !filterType && activeZone !== 'business' && totals.total > 0 && (
          <Item className="card">
            <h2 className="label">Needs vs treats</h2>
            <div className="mt-1 flex h-2.5 w-full gap-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out" style={{ width: `${(totals.needs / totals.total) * 100}%` }} />
              <div className="h-full flex-1 rounded-full bg-amber-400" />
            </div>
            <div className="mt-2 flex justify-between text-sm font-medium">
              <span>🧺 {money(totals.needs)}</span>
              <span>🍦 {money(totals.treats)}</span>
            </div>
          </Item>
        )}

        {/* Budgets */}
        {budgetScope && !showingIncome && (
          <Item className="card">
            <div className="flex items-baseline justify-between">
              <h2 className="label mb-0">{budgetScope === 'shared' ? 'Shared budgets' : 'Your budgets'}</h2>
              <span className="text-xs text-muted">
                {budgetScope === 'shared' ? 'Both of you see these' : 'Only you see these'}
              </span>
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

            <BudgetEditor
              cats={cats}
              budgetMap={budgetMap}
              scope={budgetScope}
              onSet={(category, limit) => setBudget(category, limit, budgetScope)}
            />
          </Item>
        )}

        {/* Inline rather than its own page — and, same as the needs-vs-treats
            split above, skipped inside an already-narrowed needs/treats slice
            where "what's worth knowing" is just repeating the filter. */}
        {!filterType && !showingIncome && (
          <CoachInsights thisMonth={expenses} lastMonth={prevExpenses} budgets={budgetRows} summary={totals} />
        )}

        {/* What repeats every month, in whichever direction is being shown */}
        {(() => {
          const kind = showingIncome ? 'income' : 'expense'
          const rows = recurringItems.filter((r) => r.active && r.kind === kind)
          // Recurring income is personal, so it isn't filtered by zone; expenses are.
          const wantScope = activeZone === 'together' ? 'shared' : activeZone === 'mine' ? 'private' : 'business'
          let scoped = kind === 'expense' ? rows.filter((r) => r.scope === wantScope) : rows
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

      <Sheet open={!!openCat && !showingIncome} onClose={() => setOpenCat(null)}>
        {openCat && (() => {
          const m = categoryMeta(openCat)
          const t = cats.find((c) => c.category === openCat)?.total ?? 0
          const share = total > 0 ? Math.round((t / total) * 100) : 0
          const p = pace[openCat]
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
                <GroceryItemList expenses={expenses.filter((e) => e.category === openCat)} />
              ) : (
                <MiniExpenseList
                  expenses={expenses.filter((e) => e.category === openCat)}
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

function BudgetEditor({ cats, budgetMap, scope, onSet }) {
  const [open, setOpen] = useState(false)
  const options = useMemo(() => {
    const seen = new Set(cats.map((c) => c.category))
    return [...seen, ...Object.keys(budgetMap).filter((k) => !seen.has(k))]
  }, [cats, budgetMap])

  if (!open) {
    return (
      <button className="btn-ghost mt-3 w-full py-2.5 text-base" onClick={() => setOpen(true)}>
        Set {scope === 'shared' ? 'shared' : 'personal'} limits
      </button>
    )
  }

  return (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
      {options.length === 0 && <p className="text-sm text-muted">Log something first, then you can cap it.</p>}
      {options.map((category) => (
        <LimitRow key={category} category={category} value={budgetMap[category] || 0} onSet={onSet} />
      ))}
      <button className="btn-ghost mt-2 w-full py-2.5 text-base" onClick={() => setOpen(false)}>Done</button>
    </div>
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
