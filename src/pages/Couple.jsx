import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { useExpenses } from '../hooks/useExpenses'
import { useMoney } from '../hooks/useMoney'
import { useSettlements } from '../hooks/useSettlements'
import { useAccounts } from '../hooks/useAccounts'
import { summarize, settlement, onlySpending } from '../lib/calc'
import { categoryMeta } from '../lib/categories'
import { money, monthLabel, dayLabel } from '../lib/format'
import TopBar from '../components/TopBar'
import ReceiptViewer from '../components/ReceiptViewer'
import MovementSheet from '../components/MovementSheet'
import { Screen, Stagger, Item, Tap, Counter, motion } from '../components/motion'

const isThisMonth = (d) => {
  const n = new Date()
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()
}

// The two of you, and nothing else. What went out together this month, split
// between what you had to and what you chose to, and what's still open between
// you. Anything personal deliberately never appears here.
export default function Couple() {
  const { user, members } = useAuth()
  const [monthDate, setMonthDate] = useState(new Date())
  const { expenses: all, loading } = useExpenses(monthDate)
  const { activeBills } = useMoney(monthDate)
  const { rows: settlements, settle: recordSettlement } = useSettlements()
  const { active: myAccounts, defaultAccount } = useAccounts()
  const { notSpending } = useCategories()

  const [receipt, setReceipt] = useState(null)
  const [movement, setMovement] = useState(null)
  const [settling, setSettling] = useState(false)
  const [settleAccount, setSettleAccount] = useState(null)
  const [busy, setBusy] = useState(false)

  const shiftMonth = (d) => setMonthDate((m) => new Date(m.getFullYear(), m.getMonth() + d, 1))
  const atCurrentMonth = isThisMonth(monthDate)
  const nameOf = (id) => (id === user?.id ? 'You' : members.find((m) => m.id === id)?.display_name || '—')

  const shared = useMemo(() => all.filter((e) => e.scope === 'shared'), [all])
  const totals = summarize(onlySpending(shared, notSpending))
  const needPct = totals.total > 0 ? (totals.needs / totals.total) * 100 : 0
  const settle = useMemo(
    () => settlement(shared, members, activeBills, settlements),
    [shared, members, activeBills, settlements]
  )

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
    <div className="pb-28">
      <TopBar title="Together" subtitle="What the two of you spend" />

      <Screen className="mx-auto max-w-md px-4 space-y-4">
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

        {/* Spent together, split by whether you had to */}
        <div className="rounded-xl3 bg-mint-200 p-5">
          <p className="label mb-0 text-center text-brand-700/70">Spent together</p>
          <p className="figure mt-1 text-center text-brand-700">
            <Counter value={totals.total} format={(n) => money(n)} />
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
            <div className="text-center">
              <p className="text-xs font-medium text-brand-700/70">🧺 Needs</p>
              <p className="tnum font-bold text-brand-700">{money(totals.needs)}</p>
              <p className="text-xs text-brand-700/60">{Math.round(needPct)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-brand-700/70">🍦 Treats</p>
              <p className="tnum font-bold text-brand-700">{money(totals.treats)}</p>
              <p className="text-xs text-brand-700/60">{Math.round(100 - needPct)}%</p>
            </div>
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
            <Link to="/expenses" className="text-sm font-semibold text-brand-600">View all →</Link>
          </div>

          {!loading && movements.length === 0 && (
            <p className="py-8 text-center text-muted">Nothing shared in {monthLabel(monthDate)} yet.</p>
          )}

          <Stagger className="divide-y divide-slate-100">
            {movements.slice(0, 4).map((m) => {
              const meta = categoryMeta(m.category)
              return (
                <Item key={m.id}>
                  <Tap onClick={() => setMovement(m)} className="flex w-full items-center gap-3 py-2.5 text-left">
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

        <Item className="space-y-2.5">
          <Link to="/plan" className="card-tap flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span className="text-2xl">🔁</span>
              <span>
                <span className="block font-semibold">Every month</span>
                <span className="block text-sm text-muted">Rent, subscriptions and dates</span>
              </span>
            </span>
            <span className="text-muted">›</span>
          </Link>

          <Link to="/analytics?zone=together" className="card-tap flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <span>
                <span className="block font-semibold">Shared analysis</span>
                <span className="block text-sm text-muted">Categories, budgets and trends</span>
              </span>
            </span>
            <span className="text-muted">›</span>
          </Link>
        </Item>
      </Screen>

      <MovementSheet
        movement={movement}
        nameOf={nameOf}
        onClose={() => setMovement(null)}
        onReceipt={(raw) => { setMovement(null); setReceipt(raw) }}
      />
      {receipt && <ReceiptViewer expense={receipt} onClose={() => setReceipt(null)} />}
    </div>
  )
}
