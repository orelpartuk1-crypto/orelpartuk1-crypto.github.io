import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAllExpenses } from '../hooks/useAllExpenses'
import TopBar from '../components/TopBar'
import { categoryMeta } from '../lib/categories'
import { toCSV, downloadCSV } from '../lib/csv'
import { money, dayLabel } from '../lib/format'

const monthTitle = (key) => {
  const [y, m] = key.split('-')
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(+y, +m - 1, 1))
}

export default function Expenses() {
  const nav = useNavigate()
  const { user, members, hasBusiness } = useAuth()
  const { expenses, loading, deleteExpense } = useAllExpenses()

  // Same zone concept as Dashboard, kept in sync via the same localStorage key
  // so switching zones on one screen carries over to the other.
  const [zone, setZone] = useState(() => localStorage.getItem('db_zone') || 'together')
  const persistZone = (z) => { setZone(z); localStorage.setItem('db_zone', z) }
  const activeZone = zone === 'business' && !hasBusiness ? 'together' : zone
  const zones = [
    { key: 'together', label: '👫 Together' },
    { key: 'mine', label: '🔒 Mine' },
    ...(hasBusiness ? [{ key: 'business', label: '💼 Business' }] : []),
  ]

  const nameOf = (id) => (id === user?.id ? 'You' : members.find((m) => m.id === id)?.display_name || '—')

  const filtered = useMemo(
    () =>
      expenses.filter((e) => {
        if (activeZone === 'together') return e.scope === 'shared'
        if (activeZone === 'mine') return e.scope === 'private' && e.paid_by === user?.id
        if (activeZone === 'business') return e.scope === 'business'
        return true
      }),
    [expenses, activeZone, user?.id]
  )

  const groups = useMemo(() => {
    const g = {}
    for (const e of filtered) {
      const key = String(e.spent_at).slice(0, 7)
      ;(g[key] = g[key] || []).push(e)
    }
    return Object.keys(g).sort().reverse().map((k) => ({ key: k, total: g[k].reduce((t, e) => t + Number(e.amount), 0), items: g[k] }))
  }, [filtered])

  const grandTotal = filtered.reduce((t, e) => t + Number(e.amount), 0)

  const exportCSV = () => {
    const csv = toCSV(filtered, [
      { key: 'spent_at', label: 'Date' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount (EUR)' },
      { key: 'scope', label: 'Type' },
      { key: 'spend_type', label: 'Need/Treat' },
      { label: 'Paid by', get: (e) => nameOf(e.paid_by) },
      { key: 'note', label: 'Note' },
    ])
    downloadCSV('expenses.csv', csv)
  }

  return (
    <div className="pb-28">
      <TopBar title="All expenses" subtitle={`${filtered.length} · ${money(grandTotal)}`} back />
      <div className="mx-auto max-w-md px-4 space-y-3">
        {/* Zone toggle — same concept as Dashboard */}
        <div className="space-y-2">
          <div className="flex rounded-2xl bg-slate-100 p-1">
            {zones.map((z) => (
              <button key={z.key} onClick={() => persistZone(z.key)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${activeZone === z.key ? 'bg-white shadow-sm' : 'text-muted'}`}>
                {z.label}
              </button>
            ))}
          </div>
          <button className="btn-ghost w-full py-2.5 text-base" onClick={exportCSV} disabled={filtered.length === 0}>
            ⬇︎ Export CSV
          </button>
        </div>

        {loading && <p className="text-muted py-4">Loading…</p>}
        {!loading && filtered.length === 0 && <p className="text-muted py-8 text-center">No expenses match.</p>}

        {groups.map((grp) => (
          <div key={grp.key} className="card">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold">{monthTitle(grp.key)}</h2>
              <span className="text-sm font-semibold text-muted">{money(grp.total)}</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {grp.items.map((e) => {
                const meta = categoryMeta(e.category)
                const editable = e.paid_by === user?.id
                return (
                  <li key={e.id} className="flex items-center gap-3 py-2.5">
                    <button onClick={() => editable && nav('/add', { state: { edit: e } })} disabled={!editable}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-60 disabled:active:opacity-100">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base" style={{ backgroundColor: meta.color + '22' }}>{meta.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{e.category}{e.note ? <span className="text-muted font-normal"> · {e.note}</span> : ''}</p>
                        <p className="text-xs text-muted">
                          {dayLabel(e.spent_at)} · {nameOf(e.paid_by)} · {e.scope === 'business' ? '💼' : e.scope === 'shared' ? '🤝' : '👤'}{e.scope !== 'business' ? ` ${e.spend_type === 'treat' ? '🍦' : '🧺'}` : ''}
                        </p>
                      </div>
                      <span className="font-semibold">{money(e.amount)}</span>
                    </button>
                    {editable && (
                      <button onClick={() => deleteExpense(e.id)} className="text-slate-300 hover:text-red-500 px-1" aria-label="Delete">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
