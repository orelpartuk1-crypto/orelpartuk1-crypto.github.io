import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRecurring } from '../hooks/useRecurring'
import Segmented from '../components/Segmented'
import TopBar from '../components/TopBar'
import { money } from '../lib/format'
import { categoryMeta } from '../lib/categories'

const num = (s) => parseFloat((s || '0').replace(',', '.')) || 0

export default function Recurring() {
  const { hasBusiness } = useAuth()
  const { items, loading, add, toggle, remove } = useRecurring()
  const [kind, setKind] = useState('expense') // expense | income
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [scope, setScope] = useState('shared')
  const [spendType, setSpendType] = useState('need')
  const [source, setSource] = useState('')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  const expenses = items.filter((i) => i.kind === 'expense')
  const incomes = items.filter((i) => i.kind === 'income')

  const create = async () => {
    if (!name.trim() || num(amount) <= 0) { setErr('Enter a name and an amount.'); return }
    setErr(null); setBusy(true)
    const payload =
      kind === 'expense'
        ? { kind: 'expense', name: name.trim(), amount: num(amount), scope, spend_type: spendType, category: 'Subscriptions' }
        : { kind: 'income', name: name.trim(), amount: num(amount), source: source.trim() || name.trim() }
    const { error } = await add(payload)
    setBusy(false)
    if (error) { setErr(error.message || 'Could not save.'); return }
    setName(''); setAmount(''); setSource('')
  }

  return (
    <div className="pb-28">
      <TopBar title="Repeats monthly" subtitle="Subscriptions & regular income" back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Add form */}
        <div className="card space-y-3">
          <Segmented
            options={[{ value: 'expense', label: '💳 Expense' }, { value: 'income', label: '💰 Income' }]}
            value={kind}
            onChange={setKind}
          />
          <div className="grid grid-cols-3 gap-2">
            <input className="field col-span-2" value={name} onChange={(e) => setName(e.target.value)}
              placeholder={kind === 'expense' ? 'e.g. Netflix' : 'e.g. From mom'} />
            <input className="field" inputMode="decimal" value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="€" />
          </div>

          {kind === 'expense' ? (
            <>
              <Segmented
                options={[
                  { value: 'shared', label: '🤝 Shared' },
                  { value: 'private', label: '👤 Private' },
                  ...(hasBusiness ? [{ value: 'business', label: '💼 Business' }] : []),
                ]}
                value={scope}
                onChange={setScope}
              />
              {scope !== 'business' && (
                <Segmented
                  options={[{ value: 'need', label: '🧺 Need' }, { value: 'treat', label: '🍦 Treat' }]}
                  value={spendType}
                  onChange={setSpendType}
                />
              )}
            </>
          ) : (
            <input className="field" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source (optional) e.g. Family" />
          )}

          {err && <p className="text-sm text-red-600">{err}</p>}
          <button className="btn-primary w-full" disabled={busy} onClick={create}>{busy ? 'Saving…' : `Add monthly ${kind}`}</button>
        </div>

        {loading && <p className="text-muted">Loading…</p>}

        {expenses.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-lg mb-1">Monthly expenses</h2>
            <ul className="divide-y divide-slate-100">
              {expenses.map((i) => <Row key={i.id} item={i} onToggle={toggle} onRemove={remove} />)}
            </ul>
          </div>
        )}
        {incomes.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-lg mb-1">Monthly income</h2>
            <ul className="divide-y divide-slate-100">
              {incomes.map((i) => <Row key={i.id} item={i} onToggle={toggle} onRemove={remove} income />)}
            </ul>
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="card py-10 text-center">
            <p className="text-4xl">🔁</p>
            <p className="mt-2 font-semibold">Nothing recurring yet</p>
            <p className="text-muted text-sm">Add Netflix, gym, a monthly transfer — it'll count every month automatically.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ item, onToggle, onRemove, income }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">
        {income ? '💰' : categoryMeta(item.category).emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-medium truncate ${item.active ? '' : 'text-slate-400 line-through'}`}>{item.name}</p>
        <p className="text-xs text-muted">
          {money(item.amount)}/mo{!income && item.scope ? ` · ${item.scope}` : ''}{income && item.source ? ` · ${item.source}` : ''}
        </p>
      </div>
      <button onClick={() => onToggle(item.id, !item.active)}
        className={`flex h-6 w-11 items-center rounded-full px-0.5 transition ${item.active ? 'bg-brand-500 justify-end' : 'bg-slate-200 justify-start'}`} aria-label="Toggle active">
        <span className="h-5 w-5 rounded-full bg-white shadow" />
      </button>
      <button onClick={() => onRemove(item.id)} className="text-slate-300 hover:text-red-500 px-1" aria-label="Delete">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
      </button>
    </li>
  )
}
