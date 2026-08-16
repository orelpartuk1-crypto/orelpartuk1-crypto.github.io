import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRecurring } from '../hooks/useRecurring'
import Segmented from '../components/Segmented'
import TopBar from '../components/TopBar'
import { money } from '../lib/format'
import { categoryMeta, CATEGORIES, BUSINESS_CATEGORIES } from '../lib/categories'
import CategoryPicker from '../components/CategoryPicker'

const num = (s) => parseFloat((s || '0').replace(',', '.')) || 0

export default function Recurring() {
  const { hasBusiness } = useAuth()
  const { items, loading, add, toggle, rename, remove } = useRecurring()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [scope, setScope] = useState('shared')
  const [spendType, setSpendType] = useState('need')
  const [category, setCategory] = useState('Subscriptions')
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  // Switching to or from Business swaps which category list applies, the same
  // way the Add screen does it.
  const changeScope = (s) => {
    if (s === 'business' && scope !== 'business') setCategory('Subscriptions')
    else if (s !== 'business' && scope === 'business') setCategory('Utilities')
    setScope(s)
  }
  const categoryList = scope === 'business' ? BUSINESS_CATEGORIES : CATEGORIES

  const expenses = items.filter((i) => i.kind === 'expense')
  const incomes = items.filter((i) => i.kind === 'income')

  // This form stays expense-only on purpose: Add is the single way in for
  // anything new, income included. What's here is for reviewing and adjusting
  // what already repeats. Fixed salary never belongs in this table — it has its
  // own field, and duplicating it there is what once made income read too high.
  const create = async () => {
    if (!name.trim() || num(amount) <= 0) { setErr('Enter a name and an amount.'); return }
    setErr(null); setBusy(true)
    // Was hardcoded to 'Subscriptions', which is a Business category — so every
    // private or shared item created here landed on a category that doesn't
    // exist in its own list, and reports had nowhere sensible to put it.
    const payload = { kind: 'expense', name: name.trim(), amount: num(amount), scope, spend_type: spendType, category }
    const { error } = await add(payload)
    setBusy(false)
    if (error) { setErr(error.message || 'Could not save.'); return }
    setName(''); setAmount('')
  }

  return (
    <div className="pb-28">
      <TopBar title="Repeats monthly" subtitle="Subscriptions" back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Add form */}
        <div className="card space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <input className="field col-span-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix" />
            <input className="field" inputMode="decimal" value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="€" />
          </div>
          <Segmented
            options={[
              { value: 'shared', label: '🤝 Shared' },
              { value: 'private', label: '👤 Private' },
              ...(hasBusiness ? [{ value: 'business', label: '💼 Business' }] : []),
            ]}
            value={scope}
            onChange={changeScope}
          />
          {scope !== 'business' && (
            <Segmented
              options={[{ value: 'need', label: '🧺 Need' }, { value: 'treat', label: '🍦 Treat' }]}
              value={spendType}
              onChange={setSpendType}
            />
          )}

          <div>
            <label className="label">Category</label>
            <CategoryPicker value={category} onChange={setCategory} items={categoryList} />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
          <button className="btn-primary w-full" disabled={busy} onClick={create}>{busy ? 'Saving…' : 'Add monthly expense'}</button>
          <p className="text-xs text-muted">
            You can also check "Repeats monthly" right on the Add Expense screen — this does the same thing.
          </p>
        </div>

        {loading && <p className="text-muted">Loading…</p>}

        {expenses.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-lg mb-1">Monthly expenses</h2>
            <ul className="divide-y divide-slate-100">
              {expenses.map((i) => <Row key={i.id} item={i} onToggle={toggle} onRename={rename} onRemove={remove} />)}
            </ul>
          </div>
        )}
        {incomes.length > 0 && (
          <div className="card">
            <h2 className="font-semibold text-lg mb-1">Monthly income</h2>
            <p className="text-sm text-muted mb-2">
              Add these from the Add screen. Your fixed salary is the exception — it belongs only in{' '}
              <Link to="/salary" className="text-brand-600 underline">Salary</Link>, so if one of these is
              your salary, remove it here or it gets counted twice.
            </p>
            <ul className="divide-y divide-slate-100">
              {incomes.map((i) => <Row key={i.id} item={i} onToggle={toggle} onRename={rename} onRemove={remove} income />)}
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

function Row({ item, onToggle, onRename, onRemove, income }) {
  // Older items were all named after their category, so several can read the
  // same thing. Tap the name to say what it actually is.
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.name)
  // Enter closes the field, and closing it fires blur — without this the rename
  // would be sent twice.
  const done = useRef(false)

  const commit = async () => {
    if (done.current) return
    done.current = true
    setEditing(false)
    if (draft.trim() && draft.trim() !== item.name) await onRename(item.id, draft)
    else setDraft(item.name)
  }

  const startEditing = () => {
    done.current = false
    setDraft(item.name)
    setEditing(true)
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">
        {income ? '💰' : categoryMeta(item.category).emoji}
      </span>
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            className="field w-full py-1 text-sm"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') { done.current = true; setDraft(item.name); setEditing(false) }
            }}
          />
        ) : (
          <button onClick={startEditing} className="block w-full text-left active:opacity-60" aria-label="Rename">
            <span className={`font-medium truncate ${item.active ? '' : 'text-slate-400 line-through'}`}>{item.name}</span>
            <span className="ml-1 text-xs text-muted">✎</span>
          </button>
        )}
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
