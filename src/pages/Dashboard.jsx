import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { setPendingScan } from '../lib/pendingScan'
import { useAuth } from '../context/AuthContext'
import { useExpenses } from '../hooks/useExpenses'
import { useMoney } from '../hooks/useMoney'
import { useDates, daysUntil } from '../hooks/useDates'
import { useTreatPct } from '../hooks/useTreatPct'
import { summarize, byCategory, paidByMember, settlement, treatBalance, budgetStatus, insights, groceryBreakdown, myShareOfShared, myShareOfBills, vsLastMonth } from '../lib/calc'
import { opportunityInsights } from '../lib/opportunity'
import { paceForecast, trendInsights, savingsNudges, monthlyTotals } from '../lib/coach'
import TrendChart from '../components/TrendChart'
import { useSavings } from '../hooks/useSavings'
import { useAccounts } from '../hooks/useAccounts'
import { useSettlements } from '../hooks/useSettlements'
import { useHistory } from '../hooks/useHistory'
import { useYearStats } from '../hooks/useYearStats'
import { categoryMeta } from '../lib/categories'
import { money, monthLabel, dayLabel } from '../lib/format'
import ProgressBar from '../components/ProgressBar'
import Donut from '../components/Donut'
import TopBar from '../components/TopBar'
import MiniExpenseList from '../components/MiniExpenseList'
import ReceiptViewer from '../components/ReceiptViewer'

const isThisMonth = (d) => {
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
}

export default function Dashboard() {
  const nav = useNavigate()
  const { household, members, user, profile, myIncome, hasBusiness } = useAuth()
  const [monthDate, setMonthDate] = useState(new Date())
  const [zone, setZone] = useState(() => localStorage.getItem('db_zone') || 'together')
  // Remember the zone so the Add form defaults to it (Shared/Private/Business).
  const persistZone = (z) => { setZone(z); localStorage.setItem('db_zone', z) }
  const prevMonthDate = useMemo(() => new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1), [monthDate])

  const { expenses: all, budgets, loading, deleteExpense } = useExpenses(monthDate)
  const { expenses: prevAll } = useExpenses(prevMonthDate)
  const { activeBills, bonuses, deleteBonus } = useMoney(monthDate)
  const { dates } = useDates()
  const treatPct = useTreatPct(monthDate)
  const { goals, savedByGoal, contribs } = useSavings()
  const { rows: history } = useHistory(6)
  const { rows: settlements, reload: reloadSettlements } = useSettlements()

  // Camera button that opens the camera immediately (dialog runs in the tap).
  const scanInputRef = useRef(null)
  const onScanPick = (e) => {
    const f = e.target.files?.[0]
    if (f) { setPendingScan(f); nav('/scan') }
  }

  const shiftMonth = (delta) => setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))
  const atCurrentMonth = isThisMonth(monthDate)
  const nameOf = (id) => (id === user?.id ? 'You' : members.find((m) => m.id === id)?.display_name || '—')
  // Receipt opened from any category breakdown on this screen.
  const [receipt, setReceipt] = useState(null)

  const shared = useMemo(() => all.filter((e) => e.scope === 'shared'), [all])
  const mine = useMemo(() => all.filter((e) => e.scope === 'private' && e.paid_by === user?.id), [all, user?.id])
  const business = useMemo(() => all.filter((e) => e.scope === 'business' && e.paid_by === user?.id), [all, user?.id])
  const prevShared = useMemo(() => prevAll.filter((e) => e.scope === 'shared'), [prevAll])
  const prevMine = useMemo(() => prevAll.filter((e) => e.scope === 'private' && e.paid_by === user?.id), [prevAll, user?.id])
  const prevBusiness = useMemo(() => prevAll.filter((e) => e.scope === 'business' && e.paid_by === user?.id), [prevAll, user?.id])
  // Multi-month history slices for the trend-aware coach.
  const sharedHist = useMemo(() => history.filter((e) => e.scope === 'shared'), [history])
  const mineHist = useMemo(() => history.filter((e) => e.scope === 'private' && e.paid_by === user?.id), [history, user?.id])

  // Personal "bank account" balance for the viewed month: what came in, what
  // I actually bear of spending, and what I put toward savings vs investments.
  const balance = useMemo(() => {
    const myBonuses = bonuses.filter((b) => b.owner === user?.id).reduce((t, b) => t + Number(b.amount), 0)
    const income = (myIncome || 0) + myBonuses
    const spent = summarize(mine).total + myShareOfShared(shared, user?.id) + myShareOfBills(activeBills, user?.id)
    const goalKind = Object.fromEntries(goals.map((g) => [g.id, g.kind || 'saving']))
    let saved = 0, invested = 0
    for (const c of contribs) {
      if (c.contributor !== user?.id || Number(c.amount) <= 0) continue
      const d = new Date(c.created_at)
      if (d.getFullYear() !== monthDate.getFullYear() || d.getMonth() !== monthDate.getMonth()) continue
      if (goalKind[c.goal_id] === 'investment') invested += Number(c.amount)
      else saved += Number(c.amount)
    }
    return { income, spent, saved, invested, left: income - spent - saved - invested }
  }, [bonuses, myIncome, mine, shared, activeBills, goals, contribs, user?.id, monthDate])

  const upcoming = useMemo(() => dates.filter((d) => daysUntil(d._next) <= 45).slice(0, 3), [dates])
  const budgetMap = useMemo(() => Object.fromEntries(budgets.map((b) => [b.category, Number(b.monthly_limit)])), [budgets])
  // Average business trip cost (for the "money coach" framing).
  const tripAvg = useMemo(() => {
    const trips = business.filter((e) => ['Transport', 'Flight', 'Hotel', 'Business Meal', 'Meeting'].includes(e.category))
    const src = trips.length ? trips : business
    return src.length ? src.reduce((t, e) => t + Number(e.amount), 0) / src.length : 0
  }, [business])

  const zones = [
    { key: 'together', label: '👫 Together' },
    { key: 'mine', label: '🔒 Mine' },
    ...(hasBusiness ? [{ key: 'business', label: '💼 Business' }] : []),
  ]
  const activeZone = zone === 'business' && !hasBusiness ? 'together' : zone

  return (
    <div className="pb-28">
      <TopBar
        title={`Hi, ${profile?.display_name || ''}`}
        right={
          <div className="flex items-center gap-2">
            <input ref={scanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onScanPick} />
            <button onClick={() => scanInputRef.current?.click()} className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white shadow-sm active:scale-95" aria-label="Scan receipt">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-2h6l2 2h3v11H4z" /><circle cx="12" cy="13" r="3.2" /></svg>
            </button>
            <Link to="/settings" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm active:scale-95" aria-label="Settings">
              <GearIcon className="h-5 w-5" />
            </Link>
          </div>
        }
      />

      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Month switcher — arrows sit outside, the month itself is the pill */}
        <div className="flex items-center justify-between">
          <button onClick={() => shiftMonth(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card transition-transform duration-150 active:scale-90" aria-label="Previous month">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <span className="rounded-full bg-white px-6 py-2.5 font-semibold shadow-card">{monthLabel(monthDate)}</span>
          <button onClick={() => !atCurrentMonth && shiftMonth(1)} disabled={atCurrentMonth} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card transition-transform duration-150 active:scale-90 disabled:opacity-30 disabled:active:scale-100" aria-label="Next month">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>

        {/* Zone tabs */}
        <div className="flex rounded-full bg-black/[0.04] p-1">
          {zones.map((z) => (
            <button key={z.key} onClick={() => persistZone(z.key)}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all duration-200 ${activeZone === z.key ? 'bg-white text-ink shadow-card' : 'text-muted'}`}>
              {z.label}
            </button>
          ))}
        </div>

        {/* Coming up (private) — shown on Mine + Together */}
        {activeZone !== 'business' && upcoming.length > 0 && (
          <Link to="/dates" className="card block active:scale-[0.99]">
            <h2 className="font-semibold text-lg mb-1">🎁 Coming up</h2>
            <ul className="divide-y divide-slate-100">
              {upcoming.map((d) => {
                const days = daysUntil(d._next)
                return (
                  <li key={d.id} className="flex items-center justify-between py-2">
                    <span className="font-medium truncate">{d.title}</span>
                    <span className="flex items-center gap-2 text-sm">
                      {d.budget > 0 && <span className="text-muted">{money(d.budget)}</span>}
                      <span className={`rounded-full px-2.5 py-0.5 font-semibold ${days <= 14 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-muted'}`}>
                        {days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </Link>
        )}

        {activeZone === 'together' && (
          <TogetherZone shared={shared} prevShared={prevShared} history={sharedHist} members={members} activeBills={activeBills} budgets={budgets} nameOf={nameOf} monthLabel={monthLabel(monthDate)} monthDate={monthDate} atCurrentMonth={atCurrentMonth} treatPct={treatPct} goals={goals} savedByGoal={savedByGoal} tripAvg={tripAvg} onReceipt={setReceipt} settlements={settlements} onSettled={reloadSettlements} />
        )}
        {activeZone === 'mine' && (
          <MineZone mine={mine} prevMine={prevMine} history={mineHist} myIncome={myIncome} balance={balance} budgets={budgets} budgetMap={budgetMap} monthDate={monthDate} goals={goals} savedByGoal={savedByGoal} tripAvg={tripAvg} nameOf={nameOf} onReceipt={setReceipt} />
        )}
        {activeZone === 'business' && hasBusiness && (
          <BusinessZone business={business} prevBusiness={prevBusiness} budgetMap={budgetMap} nameOf={nameOf} onReceipt={setReceipt} />
        )}

        {/* Recent (current zone) — Mine gets a bank-style ledger (money in + out) */}
        {activeZone === 'mine' ? (
          <ActivityList
            expenses={mine}
            bonuses={bonuses.filter((b) => b.owner === user?.id)}
            myIncome={myIncome}
            monthDate={monthDate}
            loading={loading}
            onEdit={(e) => nav('/add', { state: { edit: e } })}
            onDeleteExpense={deleteExpense}
            onDeleteBonus={deleteBonus}
          />
        ) : (
          <RecentList
            expenses={activeZone === 'together' ? shared : business}
            loading={loading}
            nameOf={nameOf}
            onEdit={(e) => nav('/add', { state: { edit: e } })}
            onDelete={deleteExpense}
            canEdit={(e) => e.paid_by === user?.id}
          />
        )}
      </div>
      {receipt && <ReceiptViewer expense={receipt} onClose={() => setReceipt(null)} />}
    </div>
  )
}

function ZoneHero({ label, total, sub }) {
  return (
    <div className="animate-fade-up rounded-xl3 bg-mint-200 p-5 text-center">
      <p className="label mb-0 text-brand-700/70">{label}</p>
      <p className="figure mt-1 text-brand-700">{money(total)}</p>
      {sub && <div className="mt-3 flex justify-center gap-4 text-sm text-brand-700/80">{sub}</div>}
    </div>
  )
}

function CategoryCard({ expenses, prevExpenses = [], budgetMap, nameOf, onReceipt }) {
  const [open, setOpen] = useState(null)
  const cats = byCategory(expenses)
  const total = cats.reduce((t, c) => t + c.total, 0)
  const pace = useMemo(() => vsLastMonth(expenses, prevExpenses), [expenses, prevExpenses])
  if (cats.length === 0) return null
  const donutData = cats.map((c) => ({ label: c.category, value: c.total, color: categoryMeta(c.category).color }))
  return (
    <div className="card">
      <h2 className="font-semibold text-lg mb-2">By category</h2>
      <div className="flex justify-center mb-3">
        <Donut data={donutData} total={total} center={<><span className="text-xs text-muted">total</span><span className="font-bold">{money(total)}</span></>} />
      </div>
      <div className="divide-y divide-slate-100">
        {cats.map(({ category, total: t }) => {
          const meta = categoryMeta(category)
          const limit = budgetMap[category] || 0
          const st = budgetStatus(t, limit)
          const isOpen = open === category
          return (
            <div key={category} className="py-2.5">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : category)}
                aria-expanded={isOpen}
                className="w-full text-left active:opacity-60"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="text-xl">{meta.emoji}</span> {category}
                    <span className={`text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                  </span>
                  <span className={`font-semibold ${st.status === 'over' ? 'text-red-600' : ''}`}>
                    {money(t)}{limit > 0 && <span className="text-muted font-normal"> / {money(limit)}</span>}
                  </span>
                </div>
                {limit > 0 && <div className="mt-1.5"><ProgressBar ratio={st.ratio} status={st.status} color={meta.color} /></div>}
              </button>
              <PaceNote pace={pace[category]} />
              {isOpen && (
                <MiniExpenseList
                  expenses={expenses.filter((e) => e.category === category)}
                  nameOf={nameOf}
                  onReceipt={onReceipt}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GroceryCard({ expenses }) {
  const rows = groceryBreakdown(expenses)
  if (rows.length === 0) return null
  const priced = rows.filter((r) => r.total > 0)
  const max = Math.max(...rows.map((r) => r.total), 1)
  return (
    <div className="card">
      <h2 className="font-semibold text-lg mb-1">🛒 Groceries — what you bought</h2>
      <div className="divide-y divide-slate-100">
        {rows.slice(0, 20).map((r) => (
          <div key={r.name} className="py-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{r.name}{r.count > 1 ? <span className="text-muted font-normal"> ×{r.count}</span> : ''}</span>
              <span className="font-semibold">{r.total > 0 ? money(r.total) : '—'}</span>
            </div>
            {r.total > 0 && (
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${(r.total / max) * 100}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
      {priced.length === 0 && <p className="mt-2 text-xs text-muted">Add prices to items to see spend per product.</p>}
    </div>
  )
}

function MoneyCoach({ expenses, history = [], budgets = [], goals = [], savedByGoal = {}, tripAvg = 0, monthDate }) {
  const pace = paceForecast({ expenses, budgets, monthDate })
  const trends = trendInsights({ history })
  const nudges = savingsNudges({ expenses, budgets, goals, savedByGoal, monthDate })
  const opp = opportunityInsights({ expenses, history, goals, savedByGoal })

  if (!pace.items.length && !trends.length && !nudges.length && !opp.length) return null

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="font-semibold text-lg">🧠 Money coach</h2>
        <p className="text-sm text-muted">Watching this month and your last few months.</p>
      </div>

      {/* Mid-month pace — warn before a budget is blown */}
      {pace.active && pace.items.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">On pace · day {pace.dayOfMonth}/{pace.daysInMonth}</p>
          {pace.items.map((it) => {
            const m = categoryMeta(it.category)
            return (
              <div key={it.category} className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                <span className="flex items-center gap-2 font-medium"><span>{m.emoji}</span>{it.category}</span>
                <span className="mt-0.5 block">At this pace ≈ <b>{money(it.projected)}</b> by month-end — {money(it.over)} over your {money(it.limit)} budget.</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Multi-month trends — streaks and wins */}
      {trends.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Trends</p>
          <ul className="space-y-2">
            {trends.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.tone === 'good' ? 'bg-green-500' : 'bg-amber-500'}`} />
                <span>{t.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actionable nudge — put unused budget to work */}
      {nudges.map((n, i) => (
        <div key={i} className="rounded-2xl bg-brand-50 p-3">
          <p className="text-sm font-medium text-brand-700">{n.text}</p>
          <Link to={n.cta.to} className="mt-1 inline-block text-sm font-semibold text-brand-600">{n.cta.label}</Link>
        </div>
      ))}

      {/* Gentle ideas — trim a little on a treat to free money for what matters */}
      {opp.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">A gentle idea</p>
          <div className="space-y-3">
            {opp.map((r) => {
              const m = categoryMeta(r.category)
              return (
                <div key={r.category} className="rounded-2xl bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium"><span className="text-lg">{m.emoji}</span>{r.category}</span>
                    <span className="text-sm text-muted">{money(r.monthly)}/mo{r.share > 0 ? ` · ${r.share}% of treats` : ''}</span>
                  </div>
                  <p className="mt-1.5 flex gap-2 text-sm text-muted"><span>💡</span><span>{r.frame}</span></p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function TrendCard({ history = [] }) {
  const data = monthlyTotals(history, { months: 6 })
  if (!data.some((d) => d.total > 0)) return null
  return (
    <div className="card">
      <h2 className="font-semibold text-lg mb-2">📊 Last 6 months</h2>
      <TrendChart data={data} />
    </div>
  )
}

function InsightsCard({ thisMonth, lastMonth, budgets }) {
  const tips = insights({ thisMonth, lastMonth, budgets, summary: summarize(thisMonth) })
  if (tips.length === 0) return null
  return (
    <div className="card">
      <h2 className="font-semibold text-lg mb-1">💡 Insights</h2>
      <ul className="space-y-2">
        {tips.map((t, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.tone === 'bad' ? 'bg-red-500' : t.tone === 'warn' ? 'bg-amber-500' : t.tone === 'good' ? 'bg-green-500' : 'bg-brand-500'}`} />
            <span>{t.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Bank-account-style monthly balance: money in, then how it was used
// (spent / saved / invested) with whatever is left unallocated.
function BalanceCard({ balance, needs = 0, treats = 0 }) {
  const { income, spent, saved, invested, left } = balance
  const over = left < 0
  const pct = (v) => `${Math.max(0, Math.min(100, income > 0 ? (v / income) * 100 : 0))}%`
  const tiles = [
    { label: 'In', value: income, cls: 'text-ink' },
    { label: 'Spent', value: spent, cls: 'text-spend' },
    { label: 'Saved', value: saved, cls: 'text-brand-600' },
    { label: 'Invested', value: invested, cls: 'text-mint-300' },
  ]
  // Share of income kept — the single number worth leading with, and the one
  // that makes a good month legible at a glance.
  const keptPct = income > 0 ? Math.round((left / income) * 100) : null

  return (
    <div className="animate-fade-up space-y-4">
      <div className={`rounded-xl3 p-5 text-center ${over ? 'bg-rose-100' : 'bg-mint-200'}`}>
        <p className={`label mb-0 ${over ? 'text-rose-700/70' : 'text-brand-700/70'}`}>
          {over ? 'Overspent this month' : 'Left this month'}
        </p>
        <p className={`figure mt-1 ${over ? 'text-rose-700' : 'text-brand-700'}`}>
          {over ? '−' : '+'}{money(Math.abs(left))}
        </p>
        {keptPct != null && !over && (
          <span className="mt-2 inline-block rounded-full bg-white/60 px-3 py-1 text-sm font-semibold text-brand-700">
            {keptPct}% of your income
          </span>
        )}

        <div className={`mt-4 grid grid-cols-2 divide-x border-t pt-3 ${over ? 'divide-rose-300/60 border-rose-300/60' : 'divide-brand-500/15 border-brand-500/15'}`}>
          <div>
            <p className="text-xs font-medium text-muted">Income</p>
            <p className="tnum font-bold text-earn">{money(income)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Spent</p>
            <p className="tnum font-bold text-spend">{money(spent)}</p>
          </div>
        </div>
      </div>

      <div className="card">
        {/* How this month's income was used */}
        <div className="flex h-2.5 w-full gap-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-spend transition-[width] duration-500 ease-out" style={{ width: pct(spent) }} title="Spent" />
          <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out" style={{ width: pct(saved) }} title="Saved" />
          <div className="h-full rounded-full bg-mint-300 transition-[width] duration-500 ease-out" style={{ width: pct(invested) }} title="Invested" />
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl bg-slate-50 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t.label}</p>
              <p className={`tnum text-sm font-bold ${t.cls}`}>{money(t.value)}</p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted">Spending incl. your share of shared bills · 🧺 {money(needs)} · 🍦 {money(treats)}</p>

        {!over && saved === 0 && invested === 0 && left > 0 && (
          <Link to="/savings" className="mt-2 block text-sm font-semibold text-brand-600">
            {money(left)} unspent — move some to savings or investments →
          </Link>
        )}
      </div>
    </div>
  )
}

// The outstanding balance between the two of you, and the button that actually
// clears it. Recording it moves real money: it comes off one person's account
// and lands in the other's, which is what makes the two balances agree again.
function SettleRow({ settle, nameOf, onSettled }) {
  const { user } = useAuth()
  const { active: myAccounts, defaultAccount } = useAccounts()
  const { settle: recordSettlement } = useSettlements()
  const [open, setOpen] = useState(false)
  const [accountId, setAccountId] = useState(null)
  const [busy, setBusy] = useState(false)

  const iPay = settle.from === user?.id
  const account = accountId || defaultAccount?.id || null

  const confirm = async () => {
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
    setOpen(false)
    onSettled?.()
  }

  return (
    <div className="mt-2 rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">
          Settle up (incl. rent) — <b className="text-ink">{nameOf(settle.from)} → {nameOf(settle.to)}</b>
        </span>
        <span className="tnum font-bold text-brand-600">{money(settle.amount)}</span>
      </div>

      {!open ? (
        <button className="btn-ghost mt-2.5 w-full py-2.5 text-base" onClick={() => setOpen(true)}>
          {iPay ? 'I paid this' : 'Mark as received'}
        </button>
      ) : (
        <div className="mt-2.5 space-y-2">
          <div>
            <label className="label">{iPay ? 'Paid from' : 'Received into'}</label>
            <select className="field" value={account || ''} onChange={(e) => setAccountId(e.target.value)}>
              {myAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <p className="text-xs text-muted">
            {nameOf(iPay ? settle.to : settle.from)} picks their own account when they open the app,
            so neither of you sees the other's balance.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost py-2.5 text-base" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary py-2.5 text-base" disabled={busy || !account} onClick={confirm}>
              {busy ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// How this category is tracking against the same category last month.
function PaceNote({ pace }) {
  if (!pace) return null
  const tone = pace.status === 'over' ? 'text-red-600' : 'text-amber-600'
  return (
    <p className={`mt-1 text-xs font-medium ${tone}`}>
      {pace.status === 'over'
        ? `Past last month — ${money(pace.now)} vs ${money(pace.prev)}`
        : `${money(pace.left)} left before you match last month's ${money(pace.prev)}`}
    </p>
  )
}

// A compact list of categories with coloured bars (used for Needs / Treats).
// Tapping a category opens the expenses behind that number.
function CatList({ expenses, prevExpenses = [], empty, nameOf, onReceipt }) {
  const [open, setOpen] = useState(null)
  const cats = byCategory(expenses)
  const pace = useMemo(() => vsLastMonth(expenses, prevExpenses), [expenses, prevExpenses])
  if (cats.length === 0) return <p className="mt-2 text-sm text-muted">{empty}</p>
  const max = Math.max(...cats.map((c) => c.total), 1)
  return (
    <div className="mt-3 space-y-2.5">
      {cats.map(({ category, total }) => {
        const m = categoryMeta(category)
        const isOpen = open === category
        return (
          <div key={category}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : category)}
              aria-expanded={isOpen}
              className="w-full text-left active:opacity-60"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <span className="text-base">{m.emoji}</span>{category}
                  <span className={`text-muted transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                </span>
                <span className="font-semibold">{money(total)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${(total / max) * 100}%`, backgroundColor: m.color }} />
              </div>
            </button>
            <PaceNote pace={pace[category]} />
            {isOpen && (
              <MiniExpenseList
                expenses={expenses.filter((e) => e.category === category)}
                nameOf={nameOf}
                onReceipt={onReceipt}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function TogetherZone({ shared, prevShared, history = [], members, activeBills, budgets, nameOf, monthLabel, monthDate, atCurrentMonth, treatPct = {}, goals = [], savedByGoal = {}, tripAvg = 0, onReceipt, settlements = [], onSettled }) {
  const totals = summarize(shared)
  const settle = settlement(shared, members, activeBills, settlements)
  const treats = treatBalance(shared, members)
  const needExp = useMemo(() => shared.filter((e) => e.spend_type === 'need'), [shared])
  const treatExp = useMemo(() => shared.filter((e) => e.spend_type === 'treat'), [shared])
  // Same slices a month back, so each category can show how it is pacing.
  const prevNeedExp = useMemo(() => prevShared.filter((e) => e.spend_type === 'need'), [prevShared])
  const prevTreatExp = useMemo(() => prevShared.filter((e) => e.spend_type === 'treat'), [prevShared])
  const needPct = totals.total > 0 ? (totals.needs / totals.total) * 100 : 0
  const hasIncome = treats.rows.some((r) => (treatPct[r.id] || 0) > 0)
  const salaryGap = treats.rows.length === 2
    ? Math.abs((treatPct[treats.rows[0].id] || 0) - (treatPct[treats.rows[1].id] || 0)) * 100 : 0
  const higher = hasIncome && salaryGap >= 5
    ? ((treatPct[treats.rows[0].id] || 0) >= (treatPct[treats.rows[1].id] || 0) ? treats.rows[0] : treats.rows[1]) : null

  return (
    <>
      {/* Hero with a visual Needs vs Treats split */}
      <div className="animate-fade-up rounded-xl3 bg-mint-200 p-5">
        <p className="label mb-0 text-center text-brand-700/70">
          {atCurrentMonth ? 'Shared this month' : `Shared in ${monthLabel}`}
        </p>
        <p className="figure mt-1 text-center text-brand-700">{money(totals.total)}</p>
        <div className="mt-5 flex h-2.5 w-full gap-1 overflow-hidden rounded-full bg-white/50">
          <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out" style={{ width: `${needPct}%` }} />
          <div className="h-full flex-1 rounded-full bg-amber-400 transition-[width] duration-500 ease-out" />
        </div>
        <div className="mt-2.5 flex justify-between text-sm font-medium text-brand-700/80">
          <span>🧺 Needs {money(totals.needs)}</span>
          <span>🍦 Treats {money(totals.treats)}</span>
        </div>
      </div>

      {/* NEEDS together */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">🧺 Needs together</h2>
          <span className="text-2xl font-bold">{money(totals.needs)}</span>
        </div>
        <p className="text-sm text-muted">Split 50/50 · {money(totals.needs / 2)} each</p>
        {settle && !settle.settled ? (
          <SettleRow settle={settle} nameOf={nameOf} onSettled={onSettled} />
        ) : (
          <p className="mt-2 rounded-2xl bg-green-50 p-2.5 text-sm font-medium text-green-700">All square 🎉</p>
        )}
        <CatList expenses={needExp} prevExpenses={prevNeedExp} empty="No shared needs yet." nameOf={nameOf} onReceipt={onReceipt} />
      </div>

      {/* TREATS together */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">🍦 Treats together</h2>
          <span className="text-2xl font-bold">{money(totals.treats)}</span>
        </div>
        <p className="text-sm text-muted">Each pays their own</p>
        <div className="mt-3 space-y-2">
          {treats.rows.map((r) => {
            const sp = treatPct[r.id] || 0
            return (
              <div key={r.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{nameOf(r.id)}</span>
                  <span className="font-semibold">{money(r.amount)}{sp > 0 ? ` · ${Math.round(sp * 100)}% of income` : ''}</span>
                </div>
                <div className="mt-1"><ProgressBar ratio={Math.min(sp, 1)} status={higher && higher.id === r.id ? 'warn' : 'ok'} /></div>
              </div>
            )
          })}
        </div>
        {treats.total > 0 && (hasIncome ? (
          <p className={`mt-3 rounded-2xl p-2.5 text-sm font-medium ${higher ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
            {higher ? `⚖️ ${nameOf(higher.id)} spends a bigger share of income on treats.` : '⚖️ Balanced vs each income.'}
          </p>
        ) : (
          <Link to="/salary" className="mt-3 block text-sm text-brand-600 underline">Add salaries to compare treats vs income →</Link>
        ))}
        <CatList expenses={treatExp} prevExpenses={prevTreatExp} empty="No shared treats yet." nameOf={nameOf} onReceipt={onReceipt} />
      </div>

      <MoneyCoach expenses={shared} history={history} budgets={budgets} goals={goals} savedByGoal={savedByGoal} tripAvg={tripAvg} monthDate={monthDate} />
      <TrendCard history={history} />
      <InsightsCard thisMonth={shared} lastMonth={prevShared} budgets={budgets} />
      <GroceryCard expenses={shared} />
    </>
  )
}

function MineZone({ mine, prevMine, history = [], myIncome, balance, budgets, budgetMap, monthDate, goals = [], savedByGoal = {}, tripAvg = 0, nameOf, onReceipt }) {
  const totals = summarize(mine)
  const { bonusesYTD, spendYTD, monthsElapsed } = useYearStats()

  // Project the full year from what's gathered so far.
  const projIncome = myIncome * 12 + bonusesYTD
  const projSpend = monthsElapsed > 0 ? (spendYTD / monthsElapsed) * 12 : 0
  const projSave = projIncome - projSpend
  const saveRate = projIncome > 0 ? projSave / projIncome : 0

  return (
    <>
      {balance.income > 0 ? (
        <BalanceCard balance={balance} needs={totals.needs} treats={totals.treats} />
      ) : (
        <div className="card bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <p className="text-white/80 text-sm">Your private spending this month</p>
          <p className="mt-1 text-4xl font-bold">{money(totals.total)}</p>
          <Link to="/salary" className="mt-3 inline-block text-sm underline text-white/90">Add your income to see your balance →</Link>
        </div>
      )}

      {/* Your year — projected from actuals gathered so far */}
      {myIncome > 0 && (
        <div className="card">
          <h2 className="font-semibold text-lg">📈 Your year (projected)</h2>
          <p className="text-sm text-muted">From your income + {monthsElapsed} month{monthsElapsed > 1 ? 's' : ''} of spending so far.</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-muted">Income</p>
              <p className="font-bold">{money(projIncome)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs text-muted">Spending</p>
              <p className="font-bold">{money(projSpend)}</p>
            </div>
            <div className={`rounded-2xl p-3 ${projSave >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-xs text-muted">Left to save</p>
              <p className={`font-bold ${projSave >= 0 ? 'text-green-700' : 'text-red-700'}`}>{money(projSave)}</p>
            </div>
          </div>
          <p className="mt-3 rounded-2xl bg-brand-50 p-3 text-sm font-medium text-brand-700">
            {projSave >= 0
              ? `On track to save ~${money(projSave)} this year — ${Math.round(saveRate * 100)}% of your income. 💪`
              : `⚠️ On track to overspend by ~${money(-projSave)} this year. Trim treats to turn it around.`}
          </p>
        </div>
      )}

      <MoneyCoach expenses={mine} history={history} budgets={budgets} goals={goals} savedByGoal={savedByGoal} tripAvg={tripAvg} monthDate={monthDate} />
      <TrendCard history={history} />
      <InsightsCard thisMonth={mine} lastMonth={prevMine} budgets={budgets} />
      <CategoryCard expenses={mine} prevExpenses={prevMine} budgetMap={budgetMap} nameOf={nameOf} onReceipt={onReceipt} />
      <GroceryCard expenses={mine} />
    </>
  )
}

function BusinessZone({ business, prevBusiness = [], budgetMap, nameOf, onReceipt }) {
  const totals = summarize(business)
  return (
    <>
      <ZoneHero label="Business spending this month" total={totals.total} />
      <Link to="/tax" className="card flex items-center justify-between active:scale-[0.99]">
        <span className="flex items-center gap-3">
          <span className="text-2xl">🧮</span>
          <span>
            <span className="block font-semibold">Business tax estimate</span>
            <span className="block text-sm text-muted">Autónomo IRPF (Madrid) + tax saved</span>
          </span>
        </span>
        <span className="text-muted">›</span>
      </Link>
      <CategoryCard expenses={business} prevExpenses={prevBusiness} budgetMap={budgetMap} nameOf={nameOf} onReceipt={onReceipt} />
    </>
  )
}

function RecentList({ expenses, loading, nameOf, onEdit, onDelete, canEdit }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-lg">Recent</h2>
        <Link to="/expenses" className="text-sm font-medium text-brand-600">See all →</Link>
      </div>
      {loading && <p className="text-muted py-4">Loading…</p>}
      {!loading && expenses.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-muted">Nothing here yet.</p>
          <Link to="/add" className="btn-primary mt-3 inline-flex">Add an expense</Link>
        </div>
      )}
      <ul className="divide-y divide-slate-100">
        {expenses.slice(0, 15).map((e) => {
          const meta = categoryMeta(e.category)
          const editable = canEdit(e)
          return (
            <li key={e.id} className="flex items-center gap-3 py-3">
              <button onClick={() => editable && onEdit(e)} disabled={!editable} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-60 disabled:active:opacity-100">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg" style={{ backgroundColor: meta.color + '22' }}>{meta.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{e.category}{e.note ? <span className="text-muted font-normal"> · {e.note}</span> : ''}</p>
                  <p className="text-xs text-muted">
                    {dayLabel(e.spent_at)} · {nameOf(e.paid_by)}
                    {e.scope === 'shared' && e.owed_amount != null && Number(e.owed_amount) > 0
                      ? ` · owes ${money(e.owed_amount)}`
                      : e.scope === 'shared' && e.split ? ' · ½ split' : ''}
                    {e.scope !== 'business' ? ` · ${e.spend_type === 'treat' ? '🍦' : '🧺'}` : ''}
                  </p>
                </div>
                <span className="font-semibold">{money(e.amount)}</span>
              </button>
              {editable && (
                <button onClick={() => onDelete(e.id)} className="text-slate-300 hover:text-red-500 px-1" aria-label="Delete">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Bank-account-style ledger for the Mine zone: merges private expenses with
// income (salary + bonuses) into one dated list, colored green (+) vs red (-),
// so money genuinely feels like it enters and then goes out — not just spend.
function ActivityList({ expenses, bonuses, myIncome, monthDate, loading, onEdit, onDeleteExpense, onDeleteBonus }) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)

  const rows = [
    ...(myIncome > 0
      ? [{
          key: 'salary', kind: 'income', label: 'Salary', sub: 'Recurring monthly income',
          amount: myIncome, date: monthStart, emoji: '💰',
        }]
      : []),
    ...bonuses.map((b) => ({
      key: `bonus-${b.id}`, kind: 'income', label: b.bonus_type || 'Bonus', sub: dayLabel(b.created_at),
      amount: Number(b.amount), date: new Date(b.created_at), emoji: '💰', onDelete: () => onDeleteBonus(b.id),
    })),
    ...expenses.map((e) => ({
      key: `exp-${e.id}`, kind: 'expense', label: e.category, sub: `${dayLabel(e.spent_at)}${e.note ? ` · ${e.note}` : ''}`,
      amount: Number(e.amount), date: new Date(e.spent_at), emoji: categoryMeta(e.category).emoji,
      color: categoryMeta(e.category).color, onEdit: () => onEdit(e), onDelete: () => onDeleteExpense(e.id),
    })),
  ].sort((a, b) => b.date - a.date)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-lg">Activity</h2>
        <Link to="/expenses" className="text-sm font-medium text-brand-600">See all →</Link>
      </div>
      {loading && <p className="text-muted py-4">Loading…</p>}
      {!loading && rows.length === 0 && (
        <div className="py-6 text-center">
          <p className="text-muted">Nothing here yet.</p>
          <Link to="/add" className="btn-primary mt-3 inline-flex">Add an expense</Link>
        </div>
      )}
      <ul className="divide-y divide-slate-100">
        {rows.slice(0, 20).map((r) => (
          <li key={r.key} className="flex items-center gap-3 py-3">
            <button
              onClick={() => r.onEdit?.()}
              disabled={!r.onEdit}
              className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-60 disabled:active:opacity-100"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: (r.kind === 'income' ? '#059669' : r.color || '#64748b') + '22' }}
              >
                {r.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{r.label}</p>
                <p className="text-xs text-muted">{r.sub}</p>
              </div>
              <span className={`font-semibold ${r.kind === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {r.kind === 'income' ? '+' : '−'}{money(r.amount)}
              </span>
            </button>
            {r.onDelete && (
              <button onClick={r.onDelete} className="text-slate-300 hover:text-red-500 px-1" aria-label="Delete">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function GearIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  )
}
