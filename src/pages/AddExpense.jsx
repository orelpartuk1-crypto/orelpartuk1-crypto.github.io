import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useExpenses } from '../hooks/useExpenses'
import Numpad from '../components/Numpad'
import CategoryPicker from '../components/CategoryPicker'
import Segmented from '../components/Segmented'
import GrocerySelector from '../components/GrocerySelector'
import TopBar from '../components/TopBar'
import { money, dayLabel } from '../lib/format'
import { defaultSpendType, CATEGORIES, BUSINESS_CATEGORIES } from '../lib/categories'
import { findDuplicate } from '../lib/dupCheck'

// Parse the numpad string ("12,34") to a float.
const toNumber = (s) => parseFloat((s || '0').replace(',', '.')) || 0
const todayISO = () => new Date().toISOString().slice(0, 10)

export default function AddExpense() {
  const nav = useNavigate()
  const location = useLocation()
  const prefill = location.state?.prefill // from the receipt scanner
  const editing = location.state?.edit // an existing expense row
  const { user, household, hasBusiness, members } = useAuth()
  const { addExpense, updateExpense, deleteExpense } = useExpenses()

  const seed = editing || prefill || {}
  // Default the scope to the zone the user was viewing (Shared / Mine / Business).
  const defaultScope = (() => {
    if (editing?.scope) return editing.scope
    if (prefill?.scope) return prefill.scope
    const z = localStorage.getItem('db_zone')
    if (z === 'business' && hasBusiness) return 'business'
    if (z === 'mine') return 'private'
    return 'shared'
  })()
  const [amount, setAmount] = useState(
    seed.amount ? String(seed.amount).replace('.', ',') : ''
  )
  const [category, setCategory] = useState(seed.category || (defaultScope === 'business' ? 'Meeting' : 'Groceries'))
  const [scope, setScope] = useState(defaultScope)
  const [spendType, setSpendType] = useState(
    editing?.spend_type || defaultSpendType(seed.category || 'Groceries')
  )
  const [items, setItems] = useState(
    Array.isArray(seed.items)
      ? seed.items.map((i) => ({ name: i.name, price: String(i.price ?? '').replace('.', ',') }))
      : []
  )
  const [note, setNote] = useState(editing?.note || '')
  const [spentAt, setSpentAt] = useState(seed.date || editing?.spent_at || todayISO())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [dupWarn, setDupWarn] = useState(false)

  const value = toNumber(amount)

  // --- Partial split: how much the other partner owes the payer back ---
  const partner = members?.find((m) => m.id !== user?.id)
  const canSplit = scope === 'shared' && members?.length === 2
  const initialOwed = editing?.owed_amount ?? prefill?.owed_amount ?? null
  const [splitMode, setSplitMode] = useState(() => {
    if (initialOwed == null) return defaultSpendType(seed.category || 'Groceries') === 'need' ? 'even' : 'mine'
    if (Number(initialOwed) === 0) return 'mine'
    return 'custom'
  })
  const [owedInput, setOwedInput] = useState(
    initialOwed != null && Number(initialOwed) > 0 ? String(initialOwed).replace('.', ',') : ''
  )
  // Euros the partner owes, resolved from the current mode.
  const owedAmount = !canSplit
    ? null
    : splitMode === 'even'
      ? Math.round((value / 2) * 100) / 100
      : splitMode === 'mine'
        ? 0
        : Math.min(toNumber(owedInput), value)
  const owedPct = value > 0 && owedAmount != null ? Math.round((owedAmount / value) * 100) : 0
  const setOwedFromPct = (pctStr) => {
    const pct = Math.max(0, Math.min(100, toNumber(pctStr)))
    setOwedInput(String(Math.round(value * pct) / 100).replace('.', ','))
  }

  const scopeOptions = [
    { value: 'shared', label: '🤝 Shared' },
    { value: 'private', label: '👤 Private' },
    ...(hasBusiness ? [{ value: 'business', label: '💼 Business' }] : []),
  ]

  // Switching to/from Business swaps the category set.
  const changeScope = (s) => {
    if (s === 'business' && scope !== 'business') setCategory('Meeting')
    else if (s !== 'business' && scope === 'business') {
      setCategory('Groceries')
      setSpendType(defaultSpendType('Groceries'))
    }
    setScope(s)
  }

  const save = async (force = false) => {
    if (value <= 0) return
    setErr(null)
    // Warn if the same person already logged this exact amount+category+date.
    if (!editing && !force) {
      setBusy(true)
      const dup = await findDuplicate({ household_id: household?.id, paid_by: user?.id, spent_at: spentAt, category, amount: value })
      setBusy(false)
      if (dup) { setDupWarn(true); return }
    }
    setBusy(true)
    const row = {
      amount: value,
      category,
      scope,
      spend_type: spendType,
      paid_by: user?.id, // you can only log your own expenses
      owed_amount: owedAmount, // null unless it's a shared split
      note: note.trim() || null,
      spent_at: spentAt,
      items: (() => {
        const rows = items
          .filter((i) => i.name && i.name.trim())
          .map((i) => ({ name: i.name.trim(), price: parseFloat((String(i.price) || '0').replace(',', '.')) || 0 }))
        return rows.length ? rows : null
      })(),
    }
    const { error } = editing
      ? await updateExpense(editing.id, row)
      : await addExpense(row)
    setBusy(false)
    if (error) { setErr(error.message); return }
    nav('/')
  }

  const remove = async () => {
    if (!editing) return
    setBusy(true)
    await deleteExpense(editing.id)
    setBusy(false)
    nav('/')
  }

  return (
    <div className="pb-40">
      <TopBar
        title={editing ? 'Edit expense' : 'Add expense'}
        back
        right={
          !editing && (
            <Link to="/scan" className="flex h-10 items-center gap-1.5 rounded-full bg-white px-3 shadow-sm text-brand-600 font-medium active:scale-95">
              <CameraIcon className="h-5 w-5" /> Scan
            </Link>
          )
        }
      />

      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Amount display */}
        <div className="card text-center py-6">
          <p className="text-sm text-muted">Amount</p>
          <p className={`mt-1 text-5xl font-bold tracking-tight ${value ? 'text-ink' : 'text-slate-300'}`}>
            {money(value)}
          </p>
        </div>

        <Numpad value={amount} onChange={setAmount} />

        {/* Type / need-treat / split */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="label">Type</label>
            <Segmented options={scopeOptions} value={scope} onChange={changeScope} />
          </div>
          {scope !== 'business' && (
            <div>
              <label className="label">Need or treat?</label>
              <Segmented
                options={[
                  { value: 'need', label: '🧺 Need' },
                  { value: 'treat', label: '🍦 Treat' },
                ]}
                value={spendType}
                onChange={setSpendType}
              />
            </div>
          )}
        </div>

        {/* Partial split — how much the partner owes the payer back */}
        {canSplit && (
          <div>
            <label className="label">What {partner?.display_name || 'they'} owe{partner ? 's' : ''} you back</label>
            <Segmented
              options={[
                { value: 'even', label: '½ 50/50' },
                { value: 'mine', label: 'I cover it' },
                { value: 'custom', label: 'Custom' },
              ]}
              value={splitMode}
              onChange={setSplitMode}
            />
            {splitMode === 'custom' ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Amount (€)</label>
                  <input
                    className="field"
                    inputMode="decimal"
                    value={owedInput}
                    onChange={(e) => setOwedInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                    placeholder="e.g. 12"
                  />
                </div>
                <div>
                  <label className="label">Percent (%)</label>
                  <input
                    className="field"
                    inputMode="numeric"
                    value={owedPct ? String(owedPct) : ''}
                    onChange={(e) => setOwedFromPct(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 25"
                  />
                </div>
              </div>
            ) : null}
            <p className="mt-1.5 text-sm text-muted">
              {owedAmount > 0
                ? `${partner?.display_name || 'They'} owe${partner ? 's' : ''} you ${money(owedAmount)}${value > 0 ? ` · ${owedPct}% of ${money(value)}` : ''}.`
                : `You cover this one — nothing owed back.`}
            </p>
          </div>
        )}

        <div>
          <label className="label">Category</label>
          <CategoryPicker
            value={category}
            items={scope === 'business' ? BUSINESS_CATEGORIES : CATEGORIES}
            onChange={(c) => {
              setCategory(c)
              if (!editing && scope !== 'business') setSpendType(defaultSpendType(c))
            }}
          />
        </div>

        {/* Itemized products (groceries, or anything scanned) */}
        {(category === 'Groceries' || items.length > 0) && (
          <GrocerySelector
            items={items}
            onChange={setItems}
            onUseTotal={(sum) => setAmount(String(sum.toFixed(2)).replace('.', ','))}
          />
        )}

        {/* Date — defaults to today, editable, auto-filled from scans */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date</label>
            <input
              className="field"
              type="date"
              value={spentAt}
              max={todayISO()}
              onChange={(e) => setSpentAt(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Note (optional)</label>
            <input
              className="field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. weekly shop"
            />
          </div>
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        {dupWarn && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-medium text-amber-800">
              ⚠️ Possible duplicate — you already logged {money(value)} for {category} on {dayLabel(spentAt)}.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button className="btn-ghost py-2.5 text-base" onClick={() => setDupWarn(false)}>Cancel</button>
              <button className="btn-primary py-2.5 text-base" disabled={busy} onClick={() => save(true)}>Add anyway</button>
            </div>
          </div>
        )}

        {editing && (
          <button className="btn-ghost w-full text-red-600" disabled={busy} onClick={remove}>
            Delete expense
          </button>
        )}
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur px-4 pt-3 safe-bottom">
        <div className="mx-auto max-w-md">
          <button className="btn-primary w-full" disabled={busy || value <= 0} onClick={() => save()}>
            {busy ? 'Saving…' : editing ? `Update ${money(value)}` : `Save ${money(value)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function CameraIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  )
}
