import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounts } from '../hooks/useAccounts'
import { useHoldings } from '../hooks/useHoldings'
import { useSavings } from '../hooks/useSavings'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/TopBar'
import { money } from '../lib/format'

const num = (s) => parseFloat((s || '0').replace(',', '.')) || 0

const KINDS = [
  { value: 'investment', label: 'Investment', emoji: '📈' },
  { value: 'property', label: 'Property', emoji: '🏠' },
  { value: 'crypto', label: 'Crypto', emoji: '🪙' },
  { value: 'other', label: 'Other', emoji: '📦' },
  { value: 'debt', label: 'Debt', emoji: '💳' },
]
const kindMeta = (k) => KINDS.find((x) => x.value === k) || KINDS[3]

// Everything you're worth, yours alone. Shared spending lives in the couple
// area and never lands here — this screen answers "where do I stand", not
// "what did we spend".
export default function Wealth() {
  const { profile } = useAuth()
  const { active: accounts, total: liquid } = useAccounts()
  const { assets, debts, assetsTotal, debtsTotal, loading, add, update, remove } = useHoldings()
  const { goals, savedByGoal } = useSavings()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)

  const netWorth = liquid + assetsTotal - debtsTotal
  const gross = liquid + assetsTotal
  const pct = (v) => (gross > 0 ? Math.round((v / gross) * 100) : 0)
  const salary = Number(profile?.monthly_income ?? 0)
  const savedTotal = Object.values(savedByGoal).reduce((t, v) => t + Number(v || 0), 0)

  return (
    <div className="pb-28">
      <TopBar title="Wealth" subtitle="Yours — not shared with anyone" />
      <div className="mx-auto max-w-md px-4 space-y-4">
        <div className="animate-fade-up rounded-xl3 bg-mint-200 p-5 text-center">
          <p className="label mb-0 text-brand-700/70">Net worth</p>
          <p className={`figure mt-1 ${netWorth < 0 ? 'text-spend' : 'text-brand-700'}`}>{money(netWorth)}</p>
          {debtsTotal > 0 && (
            <p className="mt-1 text-sm text-brand-700/70">
              {money(gross)} held, {money(debtsTotal)} owed
            </p>
          )}
        </div>

        {loading && <p className="text-muted">Loading…</p>}

        <div className="card space-y-3">
          <Bar
            to="/accounts"
            emoji="🏦"
            title="Liquidity"
            sub={`${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
            value={liquid}
            pct={pct(liquid)}
            color="#0f7a3e"
          />
          <Bar
            emoji="📈"
            title="Assets"
            sub={assets.length ? `${assets.length} position${assets.length === 1 ? '' : 's'}` : 'Nothing yet'}
            value={assetsTotal}
            pct={pct(assetsTotal)}
            color="#6d8fd6"
          />
          <Bar
            emoji="💳"
            title="Debts"
            sub={debts.length ? `${debts.length} owed` : 'No debts'}
            value={debtsTotal}
            pct={gross > 0 ? Math.min(100, Math.round((debtsTotal / gross) * 100)) : 0}
            color="#d24a3c"
            negative
          />
        </div>

        {/* Holdings themselves */}
        {[...assets, ...debts].length > 0 && (
          <div className="card">
            <h2 className="label">What you hold</h2>
            <ul className="divide-y divide-slate-100">
              {[...assets, ...debts].map((h) => {
                const m = kindMeta(h.kind)
                const isDebt = h.kind === 'debt'
                return (
                  <li key={h.id}>
                    <button onClick={() => setEditing(h)} className="flex w-full items-center gap-3 py-2.5 text-left active:opacity-60">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">{m.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{h.name}</span>
                        <span className="block text-xs text-muted">{m.label}</span>
                      </span>
                      <span className={`tnum shrink-0 font-semibold ${isDebt ? 'text-spend' : ''}`}>
                        {isDebt ? '−' : ''}{money(h.value)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {!adding ? (
          <button className="btn-ghost w-full" onClick={() => setAdding(true)}>+ Add asset or debt</button>
        ) : (
          <HoldingForm
            onCancel={() => setAdding(false)}
            onSave={async (row) => { const { error } = await add(row); if (!error) setAdding(false); return error }}
          />
        )}

        {/* The personal standing figures that belong with net worth rather than
            with the couple's monthly spending. */}
        <div className="space-y-2.5">
          <Link to="/salary" className="card-tap flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span className="text-2xl">💶</span>
              <span>
                <span className="block font-semibold">Salary</span>
                <span className="block text-sm text-muted">{salary > 0 ? `${money(salary)} a month` : 'Not set yet'}</span>
              </span>
            </span>
            <span className="text-muted">›</span>
          </Link>
          <Link to="/savings" className="card-tap flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <span>
                <span className="block font-semibold">Savings goals</span>
                <span className="block text-sm text-muted">
                  {goals.length ? `${goals.length} goal${goals.length === 1 ? '' : 's'} · ${money(savedTotal)} put aside` : 'No goals yet'}
                </span>
              </span>
            </span>
            <span className="text-muted">›</span>
          </Link>
        </div>

        <p className="px-1 text-xs text-muted">
          Investment and property values are whatever you last typed — nothing here tracks live prices.
        </p>

        {editing && (
          <EditSheet
            holding={editing}
            onClose={() => setEditing(null)}
            onSave={async (row) => { await update(editing.id, row); setEditing(null) }}
            onDelete={async () => { await remove(editing.id); setEditing(null) }}
          />
        )}
      </div>
    </div>
  )
}

function Bar({ to, emoji, title, sub, value, pct, color, negative }) {
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">{emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="block text-xs text-muted">{sub}</span>
        </span>
        <span className={`tnum shrink-0 font-bold ${negative && value > 0 ? 'text-spend' : ''}`}>
          {negative && value > 0 ? '−' : ''}{money(value)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="tnum w-10 shrink-0 text-right text-xs text-muted">{pct}%</span>
      </div>
    </>
  )
  return to ? (
    <Link to={to} className="block active:opacity-60">{inner}</Link>
  ) : (
    <div>{inner}</div>
  )
}

function HoldingForm({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState('investment')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const submit = async () => {
    if (!name.trim()) { setErr('Give it a name.'); return }
    setBusy(true); setErr(null)
    const error = await onSave({ name: name.trim(), kind, value: Math.abs(num(value)) })
    setBusy(false)
    if (error) setErr(error.message || 'Could not save.')
  }

  return (
    <div className="card space-y-3">
      <div>
        <label className="label">Name</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Index fund" />
      </div>
      <div>
        <label className="label">Type</label>
        <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map((k) => <option key={k.value} value={k.value}>{k.emoji} {k.label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{kind === 'debt' ? 'Amount owed' : 'What it is worth'}</label>
        <input
          className="field"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ''))}
          placeholder="0"
        />
        {kind === 'debt' && <p className="mt-1 text-xs text-muted">Enter it as a positive number — it's subtracted for you.</p>}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button className="btn-ghost flex-1 py-3 text-base" onClick={onCancel}>Cancel</button>
        <button className="btn-primary flex-1 py-3 text-base" disabled={busy} onClick={submit}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function EditSheet({ holding, onClose, onSave, onDelete }) {
  const [name, setName] = useState(holding.name)
  const [kind, setKind] = useState(holding.kind)
  const [value, setValue] = useState(String(holding.value))
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 animate-fade-in" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-4 pb-8 animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
        <div className="mx-auto max-w-md space-y-3">
          <h2 className="text-xl font-bold">Update value</h2>
          <div>
            <label className="label">Name</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.emoji} {k.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{kind === 'debt' ? 'Amount owed' : 'What it is worth'}</label>
            <input
              className="field"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ''))}
            />
          </div>
          <button
            className="btn-primary w-full"
            onClick={() => onSave({ name: name.trim() || holding.name, kind, value: Math.abs(num(value)) })}
          >
            Save
          </button>
          {confirmDelete ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800">Remove “{holding.name}” from your net worth?</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button className="btn-ghost py-2.5 text-base" onClick={() => setConfirmDelete(false)}>Keep it</button>
                <button className="btn py-2.5 text-base bg-red-600 text-white" onClick={onDelete}>Remove</button>
              </div>
            </div>
          ) : (
            <button className="btn-ghost w-full text-red-600" onClick={() => setConfirmDelete(true)}>Remove</button>
          )}
        </div>
      </div>
    </div>
  )
}
