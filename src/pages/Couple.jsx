import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { useExpenses } from '../hooks/useExpenses'
import { useSettlements } from '../hooks/useSettlements'
import { useAccounts } from '../hooks/useAccounts'
import { useBudgets } from '../hooks/useBudgets'
import { summarize, settlement, onlySpending, byCategory, vsLastMonth, budgetStatus } from '../lib/calc'
import { categoryMeta } from '../lib/categories'
import { money, monthLabel, dayLabel } from '../lib/format'
import TopBar from '../components/TopBar'
import Segmented from '../components/Segmented'
import Donut from '../components/Donut'
import Ring from '../components/Ring'
import ReceiptViewer from '../components/ReceiptViewer'
import MovementSheet from '../components/MovementSheet'
import MiniExpenseList from '../components/MiniExpenseList'
import GroceryItemList from '../components/GroceryItemList'
import CoachInsights from '../components/CoachInsights'
import { Screen, Stagger, Item, Tap, Counter, Sheet, AnimatePresence, motion } from '../components/motion'

const isThisMonth = (d) => {
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
}

// The two of you, and nothing else. What went out together this month, split
// between what you had to and what you chose to, and what's still open between
// you. Anything personal deliberately never appears here.
//
// Together and its analysis used to be two screens joined by a "By category"
// link. They're one screen now, switched by a tab at the top — the data was
// always the same trip, just two ways of looking at it.
export default function Couple() {
  const { user, members } = useAuth()
  const [monthDate, setMonthDate] = useState(new Date())
  const prevMonthDate = useMemo(() => new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1), [monthDate])
  const { expenses: all, loading } = useExpenses(monthDate)
  const { expenses: prevAll } = useExpenses(prevMonthDate)
  const { rows: settlements, settle: recordSettlement } = useSettlements()
  const { active: myAccounts, defaultAccount } = useAccounts()
  const { notSpending } = useCategories()
  const { shared: sharedBudgets } = useBudgets()

  const [tab, setTab] = useState('together') // 'together' | 'analysis'
  const [receipt, setReceipt] = useState(null)
  const [movement, setMovement] = useState(null)
  const [settling, setSettling] = useState(false)
  const [settleAccount, setSettleAccount] = useState(null)
  const [busy, setBusy] = useState(false)
  // Which of Needs/Treats is open in the sheet below, and which category
  // inside it (if any) is expanded to its own mini list.
  const [openType, setOpenType] = useState(null)
  const [openCat, setOpenCat] = useState(null)
  // Same idea, for a category tapped from the Analysis tab's own list.
  const [analysisCat, setAnalysisCat] = useState(null)

  const shiftMonth = (d) => setMonthDate((m) => new Date(m.getFullYear(), m.getMonth() + d, 1))
  const atCurrentMonth = isThisMonth(monthDate)
  const nameOf = (id) => (id === user?.id ? 'You' : members.find((m) => m.id === id)?.display_name || '—')

  const shared = useMemo(() => onlySpending(all.filter((e) => e.scope === 'shared'), notSpending), [all, notSpending])
  const prevShared = useMemo(() => onlySpending(prevAll.filter((e) => e.scope === 'shared'), notSpending), [prevAll, notSpending])
  const totals = summarize(shared)
  const needPct = totals.total > 0 ? (totals.needs / totals.total) * 100 : 0
  const settle = useMemo(
    () => settlement(shared, members, settlements),
    [shared, members, settlements]
  )

  // Categories behind whichever of Needs/Treats is open — the same shape
  // Analytics builds, just pre-sliced to one spend type so there's no second
  // "needs vs treats" split to show inside a view that's already one of them.
  const typeExpenses = useMemo(
    () => (openType ? shared.filter((e) => e.spend_type === openType) : []),
    [shared, openType]
  )
  const typeCats = useMemo(() => byCategory(typeExpenses), [typeExpenses])
  const typeTotal = openType === 'need' ? totals.needs : openType === 'treat' ? totals.treats : 0
  const sharedBudgetRows = useMemo(
    () => Object.entries(sharedBudgets).map(([category, monthly_limit]) => ({ category, monthly_limit })),
    [sharedBudgets]
  )

  // The Analysis tab's own picture of the same month.
  const cats = useMemo(() => byCategory(shared), [shared])
  const catsTotal = totals.total
  const pace = useMemo(() => vsLastMonth(shared, prevShared), [shared, prevShared])
  const budgeted = cats.filter((c) => (sharedBudgets[c.category] || 0) > 0)

  const openTypeSheet = (t) => {
    setOpenType(t)
    setOpenCat(null)
  }

  const movements = useMemo(
    () =>
      shared
        .map((e) => ({
          id: `e-${e.id}`,
          type: 'expense',
          direction: 'out',
          label: e.note || e.category,
          amount: Number(e.amount),
          date: e.spent_at,
          category: e.category,
          scope: e.scope,
          spend_type: e.spend_type,
          paid_by: e.paid_by,
          owed_amount: e.owed_amount,
          items: e.items,
          receipt_path: e.receipt_path,
          account_id: e.account_id,
          viewerId: user?.id,
          raw: e,
        }))
        .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    [shared, user?.id]
  )

  const iPay = settle && settle.from === user?.id
  const confirmSettle = async () => {
    const account = settleAccount || defaultAccount?.id
    if (!account) return
    setBusy(true)
    await recordSettlement({
      payer: settle.from,
      payee: settle.to,
      amount: Math.round(settle.amount * 100) / 100,
      payer_account: iPay ? account : null,
      payee_account: iPay ? null : account,
    })
    setBusy(false)
    setSettling(false)
  }

  return (
    <div className="pb-32">
      <TopBar title="Together" subtitle="What the two of you spend" />

      <Screen className="mx-auto max-w-md px-4 space-y-4">
        <Segmented
          options={[{ value: 'together', label: 'Together' }, { value: 'analysis', label: 'Analysis' }]}
          value={tab}
          onChange={setTab}
        />

        <div className="flex items-center justify-between">
          <Tap onClick={() => shiftMonth(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card" aria-label="Previous month">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </Tap>
          <span className="rounded-full bg-white px-6 py-2.5 font-semibold shadow-card">{monthLabel(monthDate)}</span>
          <Tap onClick={() => !atCurrentMonth && shiftMonth(1)} disabled={atCurrentMonth}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card disabled:opacity-30" aria-label="Next month">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </Tap>
        </div>

        {/* Same slide the rest of the app uses between screens — this just
            happens to be two views of one screen instead of two routes. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: tab === 'analysis' ? 18 : -18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tab === 'analysis' ? -18 : 18 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            {tab === 'together' ? (
              <>
                {/* Spent together, split by whether you had to */}
                <div className="rounded-xl3 bg-mint-200 p-5">
                  <p className="label mb-0 text-center text-brand-700/70">Spent together</p>
                  <p className="figure mt-1 text-center text-brand-700">
                    <Counter id="couple-total" ready={!loading} value={totals.total} format={(n) => money(n)} />
                  </p>

                  <div className="mt-5 flex h-3 w-full gap-1 overflow-hidden rounded-full bg-white/50">
                    <motion.div
                      className="h-full rounded-full bg-brand-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${needPct}%` }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                    />
                    <motion.div
                      className="h-full flex-1 rounded-full bg-amber-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-2 divide-x divide-brand-500/15">
                    <Tap
                      onClick={() => openTypeSheet('need')}
                      className={`rounded-xl2 py-1 text-center transition-colors ${openType === 'need' ? 'bg-white/60' : ''}`}
                    >
                      <p className="text-xs font-medium text-brand-700/70">🧺 Needs</p>
                      <p className="tnum font-bold text-brand-700">{money(totals.needs)}</p>
                      <p className="text-xs text-brand-700/60">{Math.round(needPct)}%</p>
                    </Tap>
                    <Tap
                      onClick={() => openTypeSheet('treat')}
                      className={`rounded-xl2 py-1 text-center transition-colors ${openType === 'treat' ? 'bg-white/60' : ''}`}
                    >
                      <p className="text-xs font-medium text-brand-700/70">🍦 Treats</p>
                      <p className="tnum font-bold text-brand-700">{money(totals.treats)}</p>
                      <p className="text-xs text-brand-700/60">{Math.round(100 - needPct)}%</p>
                    </Tap>
                  </div>
                </div>

                {/* Where you stand with each other */}
                {settle && (
                  <Item className="card">
                    {settle.settled ? (
                      <p className="rounded-2xl bg-green-50 p-3 text-center text-sm font-semibold text-green-700">
                        All square 🎉
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted">
                            <b className="text-ink">{nameOf(settle.from)}</b> owes <b className="text-ink">{nameOf(settle.to)}</b>
                          </span>
                          <span className="tnum text-xl font-bold text-brand-600">{money(settle.amount)}</span>
                        </div>
                        {!settling ? (
                          <Tap className="btn-ghost mt-3 w-full py-2.5 text-base" onClick={() => setSettling(true)}>
                            {iPay ? 'I paid this' : 'Mark as received'}
                          </Tap>
                        ) : (
                          <div className="mt-3 space-y-2">
                            <div>
                              <label className="label">{iPay ? 'Paid from' : 'Received into'}</label>
                              <select className="field" value={settleAccount || defaultAccount?.id || ''} onChange={(e) => setSettleAccount(e.target.value)}>
                                {myAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                            </div>
                            <p className="text-xs text-muted">
                              {nameOf(iPay ? settle.to : settle.from)} picks their own account, so neither of you sees the other's balance.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <Tap className="btn-ghost py-2.5 text-base" onClick={() => setSettling(false)}>Cancel</Tap>
                              <Tap className="btn-primary py-2.5 text-base" disabled={busy} onClick={confirmSettle}>
                                {busy ? 'Saving…' : 'Confirm'}
                              </Tap>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </Item>
                )}

                {/* Recent shared spending */}
                <Item className="card">
                  <div className="flex items-baseline justify-between">
                    <h2 className="label mb-0">Recent together</h2>
                    <Link to="/movements?scope=shared" className="text-sm font-semibold text-brand-600">View all →</Link>
                  </div>

                  {!loading && movements.length === 0 && (
                    <p className="py-8 text-center text-muted">Nothing shared in {monthLabel(monthDate)} yet.</p>
                  )}

                  <Stagger className="divide-y divide-slate-100">
                    {movements.slice(0, 4).map((m) => {
                      const meta = categoryMeta(m.category)
                      return (
                        <Item key={m.id}>
                          <Tap onClick={() => setMovement(m)} className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left active:bg-slate-100">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base" style={{ backgroundColor: meta.color + '22' }}>
                              {meta.emoji}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{m.label}</span>
                              <span className="block text-xs text-muted">
                                {nameOf(m.paid_by)} · {dayLabel(m.date)} · {m.spend_type === 'treat' ? '🍦' : '🧺'}
                              </span>
                            </span>
                            <span className="tnum shrink-0 font-semibold">{money(m.amount)}</span>
                          </Tap>
                        </Item>
                      )
                    })}
                  </Stagger>
                </Item>
              </>
            ) : (
              <>
                {/* Donut + category list — tap a category to open what's behind it */}
                <div className="card">
                  {cats.length === 0 ? (
                    <p className="py-8 text-center text-muted">Nothing shared in {monthLabel(monthDate)} yet.</p>
                  ) : (
                    <>
                      <div className="my-4 flex justify-center">
                        <Donut
                          size={190}
                          stroke={24}
                          data={cats.map((c) => ({ label: c.category, value: c.total, color: categoryMeta(c.category).color }))}
                          total={catsTotal}
                          selected={analysisCat}
                          onSelect={(label) => setAnalysisCat(label)}
                          center={
                            <>
                              <span className="text-xs text-muted">{analysisCat || 'total'}</span>
                              <span className="tnum text-xl font-bold">
                                {money(analysisCat ? (cats.find((c) => c.category === analysisCat)?.total ?? 0) : catsTotal)}
                              </span>
                            </>
                          }
                        />
                      </div>
                      <div className="divide-y divide-slate-100">
                        {cats.map(({ category, total: t }) => {
                          const m = categoryMeta(category)
                          const share = catsTotal > 0 ? Math.round((t / catsTotal) * 100) : 0
                          const p = pace[category]
                          return (
                            <div key={category} className="py-2">
                              <button
                                onClick={() => setAnalysisCat(category)}
                                className="flex w-full items-center gap-2.5 text-left active:opacity-60"
                              >
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                                <span className="min-w-0 flex-1 truncate font-medium">{category}</span>
                                <span className="tnum shrink-0 text-sm text-muted">{share}%</span>
                                <span className="tnum shrink-0 font-semibold">{money(t)}</span>
                                <span className="shrink-0 text-muted">›</span>
                              </button>
                              {p && (
                                <p className={`mt-0.5 pl-5 text-xs font-medium ${p.status === 'over' ? 'text-spend' : 'text-amber-600'}`}>
                                  {p.status === 'over'
                                    ? `Past last month's ${money(p.prev)}`
                                    : `${money(p.left)} left before last month's ${money(p.prev)}`}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>

                {budgeted.length > 0 && (
                  <div className="card">
                    <h2 className="label">Shared budgets</h2>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {budgeted.map(({ category, total: t }) => {
                        const limit = sharedBudgets[category]
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
                  </div>
                )}

                <CoachInsights thisMonth={shared} lastMonth={prevShared} budgets={sharedBudgetRows} summary={totals} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </Screen>

      <MovementSheet
        movement={movement}
        nameOf={nameOf}
        onClose={() => setMovement(null)}
        onReceipt={(raw) => { setMovement(null); setReceipt(raw) }}
      />
      {receipt && <ReceiptViewer expense={receipt} onClose={() => setReceipt(null)} />}

      <Sheet open={!!openType} onClose={() => setOpenType(null)}>
        {openType && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-bold">{openType === 'need' ? '🧺 Needs' : '🍦 Treats'}</h2>
              <span className="tnum text-lg font-bold">{money(typeTotal)}</span>
            </div>
            <p className="text-sm text-muted">
              {openType === 'need' ? 'What you had to spend, together.' : 'What you chose to spend, together.'}
            </p>

            {typeCats.length === 0 ? (
              <p className="py-8 text-center text-muted">Nothing here yet in {monthLabel(monthDate)}.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {typeCats.map(({ category, total: t }) => {
                  const m = categoryMeta(category)
                  const share = typeTotal > 0 ? Math.round((t / typeTotal) * 100) : 0
                  const isOpen = openCat === category
                  return (
                    <div key={category} className="py-2">
                      <button
                        onClick={() => setOpenCat(isOpen ? null : category)}
                        className="flex w-full items-center gap-2.5 text-left active:opacity-60"
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                        <span className="min-w-0 flex-1 truncate font-medium">{category}</span>
                        <span className="tnum shrink-0 text-sm text-muted">{share}%</span>
                        <span className="tnum shrink-0 font-semibold">{money(t)}</span>
                        <span className={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                      </button>
                      {/* Groceries: what was actually bought, ranked by price
                          with repeat items (steak, chicken, ...) merged into
                          one line each — not the shopping trips themselves. */}
                      {isOpen && category === 'Groceries' ? (
                        <GroceryItemList expenses={typeExpenses.filter((e) => e.category === category)} />
                      ) : (
                        isOpen && (
                          <MiniExpenseList
                            expenses={typeExpenses.filter((e) => e.category === category)}
                            nameOf={nameOf}
                            onReceipt={(raw) => { setOpenType(null); setReceipt(raw) }}
                          />
                        )
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </Sheet>

      <Sheet open={!!analysisCat} onClose={() => setAnalysisCat(null)}>
        {analysisCat && (() => {
          const m = categoryMeta(analysisCat)
          const t = cats.find((c) => c.category === analysisCat)?.total ?? 0
          const share = catsTotal > 0 ? Math.round((t / catsTotal) * 100) : 0
          const p = pace[analysisCat]
          const catExpenses = shared.filter((e) => e.category === analysisCat)
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl" style={{ backgroundColor: m.color + '22' }}>
                  {m.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-bold">{analysisCat}</h2>
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
              {analysisCat === 'Groceries' ? (
                <GroceryItemList expenses={catExpenses} />
              ) : (
                <MiniExpenseList
                  expenses={catExpenses}
                  nameOf={nameOf}
                  onReceipt={(raw) => { setAnalysisCat(null); setReceipt(raw) }}
                />
              )}
            </div>
          )
        })()}
      </Sheet>
    </div>
  )
}
