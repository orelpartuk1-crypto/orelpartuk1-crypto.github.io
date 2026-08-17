import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAllExpenses } from '../hooks/useAllExpenses'
import { useMoney } from '../hooks/useMoney'
import { useAccounts } from '../hooks/useAccounts'
import { categoryMeta } from '../lib/categories'
import { money, dayLabel } from '../lib/format'
import TopBar from '../components/TopBar'
import ReceiptViewer from '../components/ReceiptViewer'
import MovementSheet from '../components/MovementSheet'
import { Screen, Stagger, Item, Tap } from '../components/motion'

const monthTitle = (key) => {
  const [y, m] = key.split('-')
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(+y, +m - 1, 1))
}

// Everything that moved, out and in together, grouped by month. The home screen
// shows four; this is where "all of them" actually lives.
export default function Movements() {
  const { user, members } = useAuth()
  const { expenses, loading } = useAllExpenses()
  const { bonuses } = useMoney()
  const { accounts } = useAccounts()
  const [params] = useSearchParams()

  // Arriving from Together: shared spending only, nothing personal or
  // business, and no incomes — there's no such thing as shared income.
  const scopeLocked = params.get('scope') === 'shared'

  const [dir, setDir] = useState('all') // all | out | in
  const [who, setWho] = useState('all')
  const [receipt, setReceipt] = useState(null)
  const [movement, setMovement] = useState(null)

  const nameOf = (id) => (id === user?.id ? 'You' : members.find((m) => m.id === id)?.display_name || '—')
  const accountName = (id) => accounts.find((a) => a.id === id)?.name || null
  const others = members.filter((m) => m.id !== user?.id)

  const rows = useMemo(() => {
    const scoped = scopeLocked ? expenses.filter((e) => e.scope === 'shared') : expenses
    const out = scoped.map((e) => ({
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
    if (scopeLocked) return out.sort((a, b) => String(b.date).localeCompare(String(a.date)))
    // Unlike Home's preview, this is the full picture — both of your incomes,
    // filterable by the "who" toggle below same as expenses.
    const inn = bonuses
      .map((b) => ({
        id: `i-${b.id}`,
        type: 'income',
        direction: 'in',
        label: b.note || b.bonus_type || 'Income',
        amount: Number(b.amount),
        date: b.month,
        paid_by: b.owner,
        account_id: b.account_id,
        viewerId: user?.id,
        raw: b,
      }))
    return [...out, ...inn].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }, [expenses, bonuses, user?.id, scopeLocked])

  const filtered = rows.filter((r) => {
    if (!scopeLocked && dir !== 'all' && r.direction !== dir) return false
    if (who !== 'all' && r.paid_by !== who) return false
    return true
  })

  const groups = useMemo(() => {
    const g = {}
    for (const r of filtered) {
      const k = String(r.date).slice(0, 7)
      ;(g[k] = g[k] || []).push(r)
    }
    return Object.keys(g)
      .sort()
      .reverse()
      .map((k) => ({
        key: k,
        rows: g[k],
        out: g[k].filter((r) => r.direction === 'out').reduce((t, r) => t + r.amount, 0),
        in: g[k].filter((r) => r.direction === 'in').reduce((t, r) => t + r.amount, 0),
      }))
  }, [filtered])

  return (
    <div className="pb-28">
      <TopBar
        title={scopeLocked ? 'Shared movements' : 'All movements'}
        subtitle={scopeLocked ? `${filtered.length} entries · shared only` : `${filtered.length} entries`}
        back
      />
      <Screen className="mx-auto max-w-md px-4 space-y-4">
        {!scopeLocked && (
          <div className="flex rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.06]">
            {[
              { k: 'all', l: 'All' },
              { k: 'out', l: 'Out' },
              { k: 'in', l: 'In' },
            ].map((o) => (
              <button
                key={o.k}
                onClick={() => setDir(o.k)}
                className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all duration-200 ${
                  dir === o.k ? `bg-white shadow-card ${o.k === 'in' ? 'text-earn' : o.k === 'out' ? 'text-spend' : 'text-ink'}` : 'text-muted'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        )}

        {members.length > 1 && (
          <div className="flex rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.06]">
            {[{ k: 'all', l: 'Both' }, { k: user?.id, l: 'You' }, ...others.map((m) => ({ k: m.id, l: m.display_name }))].map((o) => (
              <button
                key={o.k}
                onClick={() => setWho(o.k)}
                className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all duration-200 ${
                  who === o.k ? 'bg-white text-ink shadow-card' : 'text-muted'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        )}

        {loading && rows.length === 0 && <p className="py-6 text-center text-muted">Loading…</p>}
        {!loading && filtered.length === 0 && <p className="py-10 text-center text-muted">Nothing matches.</p>}

        {groups.map((g) => (
          <Item key={g.key} className="card">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="font-semibold">{monthTitle(g.key)}</h2>
              <span className="tnum text-sm">
                {g.in > 0 && <span className="text-earn">+{money(g.in)}</span>}
                {g.in > 0 && g.out > 0 && <span className="text-muted"> · </span>}
                {g.out > 0 && <span className="text-spend">−{money(g.out)}</span>}
              </span>
            </div>
            <Stagger className="divide-y divide-slate-100">
              {g.rows.map((m) => {
                const meta = m.direction === 'in' ? { emoji: '💰', color: '#0f7a3e' } : categoryMeta(m.category)
                return (
                  <Item key={m.id}>
                    <Tap onClick={() => setMovement(m)} className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left active:bg-slate-100">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base" style={{ backgroundColor: meta.color + '22' }}>
                        {meta.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {m.label}
                          {m.receipt_path && <span className="ml-1 text-muted">🧾</span>}
                        </span>
                        <span className="block text-xs text-muted">
                          {dayLabel(m.date)}{m.category ? ` · ${m.category}` : ''} · {nameOf(m.paid_by)}
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
        ))}
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
