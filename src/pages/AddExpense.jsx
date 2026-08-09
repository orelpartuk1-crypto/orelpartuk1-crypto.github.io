import { useRef, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useExpenses } from '../hooks/useExpenses'
import { useMoney } from '../hooks/useMoney'
import { useRecurring } from '../hooks/useRecurring'
import Numpad from '../components/Numpad'
import CategoryPicker from '../components/CategoryPicker'
import Segmented from '../components/Segmented'
import GrocerySelector from '../components/GrocerySelector'
import SplitSlider from '../components/SplitSlider'
import TopBar from '../components/TopBar'
import { money, dayLabel, monthRange } from '../lib/format'
import { defaultSpendType, CATEGORIES, BUSINESS_CATEGORIES, BONUS_SOURCES } from '../lib/categories'
import { findDuplicate } from '../lib/dupCheck'
import { takePendingReceipt } from '../lib/pendingScan'
import { uploadReceipt } from '../lib/receipts'

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
  const { addBonus } = useMoney()
  const { add: addRecurring } = useRecurring()
  // Claimed once on mount: a scan handed over here keeps its photo through save.
  const [claimedReceipt] = useState(() => (prefill ? takePendingReceipt() : null))
  const pendingReceipt = useRef(claimedReceipt)

  // Income vs expense — never offered while editing an existing expense.
  const isIncomeCapable = !editing
  const [mode, setMode] = useState('expense') // 'expense' | 'income'
  const isIncome = isIncomeCapable && mode === 'income'
  const [source, setSource] = useState('') // income-only: where the money came from

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
  const [note, setNote] = useState(seed.note || '')
  const [spentAt, setSpentAt] = useState(seed.date || editing?.spent_at || todayISO())
  const [repeats, setRepeats] = useState(false) // "repeats monthly" — add-only, hidden when editing
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [dupWarn, setDupWarn] = useState(false)

  const value = toNumber(amount)

  // --- Partial split: how much the other partner owes the payer back ---
  // Needs are always split 50/50 automatically — no UI, no question asked.
  // Only treats get a slider, defaulting to "I cover it" (0%) unless dragged.
  const partner = members?.find((m) => m.id !== user?.id)
  const canSplit = !isIncome && scope === 'shared' && members?.length === 2
  const isTreat = !isIncome && spendType === 'treat'
  const initialOwed = editing?.owed_amount ?? prefill?.owed_amount ?? null
  const initialPct = initialOwed != null && Number(seed.amount) > 0
    ? Math.round((Number(initialOwed) / Number(seed.amount)) * 100)
    : 0
  const [treatOwedPct, setTreatOwedPct] = useState(initialPct)
  const owedAmount = canSplit && isTreat
    ? Math.round(((value * treatOwedPct) / 100) * 100) / 100
    : null

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

    // Warn if the same person already logged this exact amount+category+date
    // (income has no such concept — bonuses of the same amount aren't unusual).
    if (!isIncome && !editing && !force) {
      setBusy(true)
      const dup = await findDuplicate({ household_id: household?.id, paid_by: user?.id, spent_at: spentAt, category, amount: value })
      setBusy(false)
      if (dup) { setDupWarn(true); return }
    }

    setBusy(true)

    // "Repeats monthly" — expenses only. Income deliberately has no recurring
    // path here: salary lives solely in the Money page's dedicated field, so
    // it's never double-counted alongside a separately materialized "recurring
    // income" row (that's exactly what caused a real income mismatch once).
    // Register the template first (without materializing — we insert today's
    // occurrence directly below), then tag that occurrence with the new
    // template's id so next month's auto-materialization doesn't duplicate it.
    let recurringId = null
    if (repeats && !editing && !isIncome) {
      const recurringPayload = { kind: 'expense', name: category, amount: value, category, scope, spend_type: spendType }
      const { data: recRow, error: recErr } = await addRecurring(recurringPayload, { materialize: false })
      if (recErr) { setBusy(false); setErr(recErr.message); return }
      recurringId = recRow?.id ?? null
    }

    if (isIncome) {
      const { error } = await addBonus({
        amount: value,
        bonus_type: source.trim() || 'Bonus',
        month: monthRange(new Date(spentAt)).start,
        note: note.trim() || null,
        recurring_id: recurringId,
      })
      setBusy(false)
      if (error) { setErr(error.message); return }
      nav('/')
      return
    }

    const row = {
      amount: value,
      category,
      scope,
      spend_type: spendType,
      paid_by: user?.id, // you can only log your own expenses
      owed_amount: owedAmount, // null unless it's a shared treat split
      note: note.trim() || null,
      spent_at: spentAt,
      // Never touch recurring_id when editing — omitting the key leaves
      // whatever link (if any) the row already had untouched.
      ...(!editing ? { recurring_id: recurringId } : {}),
      items: (() => {
        const rows = items
          .filter((i) => i.name && i.name.trim())
          .map((i) => ({ name: i.name.trim(), price: parseFloat((String(i.price) || '0').replace(',', '.')) || 0 }))
        return rows.length ? rows : null
      })(),
    }
    const { data: saved, error } = editing
      ? await updateExpense(editing.id, row)
      : await addExpense(row)
    // A scan sent here to be adjusted still carries its photo — file it now that
    // the expense finally has an id. Losing the image must not lose the expense.
    if (!error && !editing && saved?.id && pendingReceipt.current) {
      await uploadReceipt(saved.id, pendingReceipt.current)
      pendingReceipt.current = null
    }
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
        title={editing ? 'Edit expense' : isIncome ? 'Add income' : 'Add expense'}
        back
        right={
          !editing && !isIncome && (
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

        {isIncomeCapable && (
          <Segmented
            options={[
              { value: 'expense', label: '💳 Expense' },
              { value: 'income', label: '💰 Income' },
            ]}
            value={mode}
            onChange={setMode}
          />
        )}

        {!isIncome && (
          <>
            {/* Type / need-treat */}
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

            {/* Partial split — treats only; needs are always 50/50, no question asked */}
            {canSplit && isTreat && (
              <div>
                <label className="label">What {partner?.display_name || 'they'} owe{partner ? 's' : ''} you back</label>
                <SplitSlider
                  value={treatOwedPct}
                  onChange={setTreatOwedPct}
                  amount={value}
                  partnerName={partner?.display_name}
                />
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

            {/* Itemized products — groceries only, not a general item list */}
            {category === 'Groceries' && (
              <GrocerySelector
                items={items}
                onChange={setItems}
                onUseTotal={(sum) => setAmount(String(sum.toFixed(2)).replace('.', ','))}
              />
            )}
          </>
        )}

        {isIncome && (
          <div>
            <label className="label">Source</label>
            <input
              className="field"
              list="bonus-sources"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Where from? e.g. Freelance"
            />
            <datalist id="bonus-sources">
              {BONUS_SOURCES.map((t) => <option key={t} value={t} />)}
            </datalist>
            <p className="mt-1.5 text-xs text-muted">
              This is for one-off income. For your recurring salary, use the Salary field in{' '}
              <Link to="/money" className="text-brand-600 underline">Income & bills</Link> instead — keeping it in one place avoids double-counting.
            </p>
          </div>
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

        {!editing && !isIncome && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={repeats} onChange={(e) => setRepeats(e.target.checked)} className="h-5 w-5" />
            Repeats monthly
          </label>
        )}

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
