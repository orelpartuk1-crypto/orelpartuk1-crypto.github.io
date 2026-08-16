import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useExpenses } from '../hooks/useExpenses'
import { useMoney } from '../hooks/useMoney'
import { useAccounts } from '../hooks/useAccounts'
import { useRecurring } from '../hooks/useRecurring'
import { useDates } from '../hooks/useDates'
import { useBudgets } from '../hooks/useBudgets'
import { useSettlements } from '../hooks/useSettlements'
import { byCategory, settlement, myShareOfShared, myShareOfBills, summarize } from '../lib/calc'
import { upcomingPayments, buildAlerts } from '../lib/upcoming'
import { setPendingScan } from '../lib/pendingScan'
import { categoryMeta } from '../lib/categories'
import { money, monthLabel, dayLabel } from '../lib/format'
import TopBar from '../components/TopBar'
import AlertBell from '../components/AlertBell'
import ReceiptViewer from '../components/ReceiptViewer'
import MovementSheet from '../components/MovementSheet'
import { Screen, Stagger, Item, Tap, Counter, motion } from '../components/motion'

const isThisMonth = (d) => {
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
}

// Three questions, in the order they get asked: how did this month go, what
// just happened, and what's about to happen.
export default function Home() {
  const nav = useNavigate()
  const { members, user, profile, myIncome } = useAuth()
  const [monthDate, setMonthDate] = useState(new Date())

  const { expenses: all, loading } = useExpenses(monthDate)
  const { activeBills, bonuses } = useMoney(monthDate)
  const { accounts } = useAccounts()
  const { items: recurringItems } = useRecurring()
  const { dates } = useDates()
  const { shared: sharedBudgets, personal: personalBudgets } = useBudgets()
  const { rows: settlements } = useSettlements()

  const [receipt, setReceipt] = useState(null)
  const [movement, setMovement] = useState(null)
  const scanInputRef = useRef(null)

  const shiftMonth = (d) => setMonthDate((m) => new Date(m.getFullYear(), m.getMonth() + d, 1))
  const atCurrentMonth = isThisMonth(monthDate)
  const nameOf = (id) => (id === user?.id ? 'You' : members.find((m) => m.id === id)?.display_name || '—')
  const accountName = (id) => accounts.find((a) => a.id === id)?.name || null

  const mine = useMemo(() => all.filter((e) => e.scope === 'private' && e.paid_by === user?.id), [all, user?.id])
  const shared = useMemo(() => all.filter((e) => e.scope === 'shared'), [all])

  // 1 — What did this month actually do to my money.
  const balance = useMemo(() => {
    const myBonuses = bonuses.filter((b) => b.owner === user?.id).reduce((t, b) => t + Number(b.amount), 0)
    const income = (myIncome || 0) + myBonuses
    const spent = summarize(mine).total + myShareOfShared(shared, user?.id) + myShareOfBills(activeBills, user?.id)
    return { income, spent, saved: income - spent, pct: income > 0 ? ((income - spent) / income) * 100 : null }
  }, [bonuses, myIncome, mine, shared, activeBills, user?.id])

  // 2 — Everything that moved, money out and money in together, newest first.
  const movements = useMemo(() => {
    const visible = all.filter((e) => e.scope === 'shared' || e.paid_by === user?.id)
    const out = visible.map((e) => ({
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
    const inn = bonuses
      .filter((b) => b.owner === user?.id)
      .map((b) => ({
        id: `i-${b.id}`,
        type: 'income',
        direction: 'in',
        label: b.note || b.bonus_type || 'Income',
        amount: Number(b.amount),
        date: b.month,
        account_id: b.account_id,
        viewerId: user?.id,
        raw: b,
      }))
    return [...out, ...inn].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }, [all, bonuses, user?.id])

  // 3 — What is still to come, in or out.
  const due = useMemo(
    () => upcomingPayments({ bills: activeBills, recurring: recurringItems, dates, myId: user?.id, withinDays: 7 }),
    [activeBills, recurringItems, dates, user?.id]
  )

  const alerts = useMemo(() => {
    const spendByCategory = Object.fromEntries(byCategory(shared).map((c) => [c.category, c.total]))
    return buildAlerts({
      budgetMap: { ...sharedBudgets, ...personalBudgets },
      spendByCategory,
      upcoming: due,
      settle: settlement(shared, members, activeBills, settlements),
      nameOf,
      myId: user?.id,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared, sharedBudgets, personalBudgets, due, members, activeBills, settlements, user?.id])

  const saved = balance.saved
  const over = saved < 0

  return (
    <div className="pb-28">
      <TopBar
        title={`Hi, ${profile?.display_name || ''}`}
        subtitle={new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
        right={
          <div className="flex items-center gap-2">
            <AlertBell alerts={alerts} />
            <input
              ref={scanInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) { setPendingScan(f); nav('/scan') }
              }}
            />
            <Tap
              onClick={() => scanInputRef.current?.click()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white shadow-fab"
              aria-label="Scan receipt"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8h3l2-2h6l2 2h3v11H4z" /><circle cx="12" cy="13" r="3.2" />
              </svg>
            </Tap>
            <Tap as={motion.a} href="/settings" onClick={(e) => { e.preventDefault(); nav('/settings') }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card" aria-label="Settings">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
            </Tap>
          </div>
        }
      />

      <Screen className="mx-auto max-w-md px-4 space-y-4">
        {/* Month */}
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

        {/* 1 — Saved this month */}
        <div className={`rounded-xl3 p-5 text-center ${over ? 'bg-rose-100' : 'bg-mint-200'}`}>
          <p className={`label mb-0 ${over ? 'text-rose-700/70' : 'text-brand-700/70'}`}>
            {over ? 'Overspent this month' : 'Saved this month'}
          </p>
          <p className={`figure mt-1 ${over ? 'text-rose-700' : 'text-brand-700'}`}>
            {over ? '−' : '+'}<Counter value={Math.abs(saved)} format={(n) => money(n)} />
          </p>
          {balance.pct != null && (
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold ${over ? 'bg-white/60 text-rose-700' : 'bg-white/60 text-brand-700'}`}
            >
              {Math.round(balance.pct)}% of your income
            </motion.span>
          )}

          <div className={`mt-4 grid grid-cols-2 divide-x border-t pt-3 ${over ? 'divide-rose-300/60 border-rose-300/60' : 'divide-brand-500/15 border-brand-500/15'}`}>
            <div>
              <p className="text-xs font-medium text-muted">Income</p>
              <p className="tnum font-bold text-earn">{money(balance.income)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Expenses</p>
              <p className="tnum font-bold text-spend">{money(balance.spent)}</p>
            </div>
          </div>

          {balance.income > 0 && (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/50">
              <motion.div
                className={`h-full rounded-full ${over ? 'bg-rose-500' : 'bg-brand-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (balance.spent / balance.income) * 100)}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              />
            </div>
          )}
        </div>

        {/* 2 — Recent movements */}
        <Item className="card">
          <div className="flex items-baseline justify-between">
            <h2 className="label mb-0">Recent</h2>
            <Link to="/expenses" className="text-sm font-semibold text-brand-600">View all →</Link>
          </div>

          {loading && movements.length === 0 && <SkeletonRows />}
          {!loading && movements.length === 0 && (
            <p className="py-8 text-center text-muted">Nothing logged in {monthLabel(monthDate)} yet.</p>
          )}

          <Stagger className="divide-y divide-slate-100">
            {movements.slice(0, 4).map((m) => {
              const meta = m.direction === 'in' ? { emoji: '💰', color: '#0f7a3e' } : categoryMeta(m.category)
              return (
                <Item key={m.id}>
                  <Tap onClick={() => setMovement(m)} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base" style={{ backgroundColor: meta.color + '22' }}>
                      {meta.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{m.label}</span>
                      <span className="block text-xs text-muted">
                        {m.category ? `${m.category} · ` : ''}{dayLabel(m.date)}
                      </span>
                    </span>
                    <span className={`tnum shrink-0 font-semibold ${m.direction === 'in' ? 'text-earn' : 'text-spend'}`}>
                      {m.direction === 'in' ? '+' : '−'}{money(m.amount)}
                    </span>
                  </Tap>
                </Item>
              )
            })}
          </Stagger>
        </Item>

        {/* 3 — Upcoming */}
        {due.length > 0 && (
          <Item className="card">
            <h2 className="label">Next 7 days</h2>
            <Stagger className="divide-y divide-slate-100">
              {due.slice(0, 4).map((u) => (
                <Item key={u.id}>
                  <div className="flex items-center gap-3 py-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-base">
                      {u.kind === 'bill' ? '🏠' : u.kind === 'date' ? '🎁' : u.direction === 'in' ? '💰' : '🔁'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{u.label}</span>
                      <span className="block text-xs text-muted">
                        {u.days === 0 ? 'Today' : u.days === 1 ? 'Tomorrow' : `In ${u.days} days`} · {dayLabel(u.date)}
                      </span>
                    </span>
                    {u.amount > 0 && (
                      <span className={`tnum shrink-0 font-semibold ${u.direction === 'in' ? 'text-earn' : 'text-muted'}`}>
                        {u.direction === 'in' ? '+' : '−'}{money(u.amount)}
                      </span>
                    )}
                  </div>
                </Item>
              ))}
            </Stagger>
          </Item>
        )}
      </Screen>

      <MovementSheet
        movement={movement}
        accountName={movement ? accountName(movement.account_id) : null}
        nameOf={nameOf}
        onClose={() => setMovement(null)}
        onReceipt={(raw) => { setMovement(null); setReceipt(raw) }}
      />
      {receipt && <ReceiptViewer expense={receipt} onClose={() => setReceipt(null)} />}
    </div>
  )
}

// A shape where the content will be, rather than the word "Loading" — the
// screen stops jumping when the data lands.
function SkeletonRows() {
  return (
    <div className="divide-y divide-slate-100">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-slate-100" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-3.5 w-14 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  )
}
