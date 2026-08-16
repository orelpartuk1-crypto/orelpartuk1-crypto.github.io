import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useExpenses } from '../hooks/useExpenses'
import { useMoney } from '../hooks/useMoney'
import { useRecurring } from '../hooks/useRecurring'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'
import Numpad from '../components/Numpad'
import CategoryPicker from '../components/CategoryPicker'
import Segmented from '../components/Segmented'
import GrocerySelector from '../components/GrocerySelector'
import SplitSlider from '../components/SplitSlider'
import TopBar from '../components/TopBar'
import { money, dayLabel, monthRange, isoDay } from '../lib/format'
import { defaultSpendType, CATEGORIES, BUSINESS_CATEGORIES, BONUS_SOURCES } from '../lib/categories'
import { findDuplicate } from '../lib/dupCheck'
import { takePendingReceipt } from '../lib/pendingScan'
import { uploadReceipt } from '../lib/receipts'

// Parse the numpad string ("12,34") to a float.
const toNumber = (s) => parseFloat((s || '0').replace(',', '.')) || 0
const todayISO = () => isoDay(new Date())

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

  // Income / transfer are only offered for new entries, never while editing.
  const isIncomeCapable = !editing
  const [mode, setMode] = useState('expense') // 'expense' | 'income' | 'transfer'
  const isIncome = isIncomeCapable && mode === 'income'
  const isTransfer = isIncomeCapable && mode === 'transfer'
  const [source, setSource] = useState('') // income-only: where the money came from

  // Which of my accounts this came out of (or went into). Every entry gets one;
  // the default is filled in as soon as the accounts load so it never blocks.
  const { active: myAccounts, defaultAccount, transfer: makeTransfer } = useAccounts()
  const [accountId, setAccountId] = useState(editing?.account_id || prefill?.account_id || null)
  const { pickList } = useCategories()
  const [categoryId, setCategoryId] = useState(editing?.category_id || null)
  const [toAccountId, setToAccountId] = useState(null) // transfer destination
  useEffect(() => {
    if (!accountId && defaultAccount) setAccountId(defaultAccount.id)
  }, [defaultAccount, accountId])
  useEffect(() => {
    if (isTransfer && !toAccountId) {
      const other = myAccounts.find((a) => a.id !== accountId)
      if (other) setToAccountId(other.id)
    }
  }, [isTransfer, toAccountId, myAccounts, accountId])

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
  const dbCategories = pickList(scope)

  // --- Partial split: how much the other partner owes the payer back ---
  // Needs are always split 50/50 automatically — no UI, no question asked.
  // Only treats get a slider, defaulting to "I cover it" (0%) unless dragged.
  const partner = members?.find((m) => m.id !== user?.id)
  const canSplit = !isIncome && !isTransfer && scope === 'shared' && members?.length === 2
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
    // The category list is per scope, so a category picked under the old scope
    // no longer exists under the new one — drop the id rather than leave it
    // pointing somewhere that isn't on screen.
    if (s !== scope) setCategoryId(null)
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

    // Moving money between your own accounts isn't spending — it never touches
    // expenses, categories or the shared split, so it short-circuits here.
    if (isTransfer) {
      if (!accountId || !toAccountId) { setErr('Pick both accounts.'); return }
      if (accountId === toAccountId) { setErr('Pick two different accounts.'); return }
      setBusy(true)
      const { error } = await makeTransfer({
        from_account: accountId,
        to_account: toAccountId,
        amount: value,
        note: note.trim() || null,
        transferred_at: spentAt,
      })
      setBusy(false)
      if (error) { setErr(error.message); return }
      nav('/')
      return
    }

    // Warn if the same person already logged this exact amount+category+date
    // (income has no such concept — bonuses of the same amount aren't unusual).
    if (!isIncome && !editing && !force) {
      setBusy(true)
      const dup = await findDuplicate({ household_id: household?.id, paid_by: user?.id, spent_at: spentAt, category, amount: value })
      setBusy(false)
      if (dup) { setDupWarn(true); return }
    }

    setBusy(true)

    // "Repeats monthly" — for money out and money in alike. Fixed salary is the
    // one thing that must NOT come through here: it has its own field, and
    // having it in both places is exactly what once made income read 3500 when
    // it was 2000. The Source hint above says so; nothing else needs blocking.
    //
    // Register the template first (without materializing — we insert this
    // month's occurrence directly below), then tag that occurrence with the new
    // template's id so next month's auto-materialization doesn't duplicate it.
    let recurringId = null
    if (repeats && !editing) {
      // Name it after what you typed, not the category. Naming every template
      // "Personal Care" made them indistinguishable in the Recurring list, so
      // duplicates of the same real thing were impossible to spot.
      const recurringPayload = isIncome
        ? { kind: 'income', name: note.trim() || source.trim() || 'Income', amount: value, source: source.trim() || 'Income' }
        : { kind: 'expense', name: note.trim() || category, amount: value, category, scope, spend_type: spendType }
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
        account_id: accountId,
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
      // Shared or not, it left one person's account — that's whose balance moves.
      account_id: accountId,
      category_id: categoryId,
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
          !editing && !isIncome && !isTransfer && (
            <Link to="/scan" className="flex h-10 items-center gap-1.5 rounded-full bg-white px-3 shadow-sm text-brand-600 font-medium active:scale-95">
              <CameraIcon className="h-5 w-5" /> Scan
            </Link>
          )
        }
      />

      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* What kind of entry this is, before anything else is decided */}
        {isIncomeCapable && (
          <div className="flex rounded-full bg-black/[0.04] p-1">
            {[
              { value: 'expense', label: 'Expense', cls: 'text-spend' },
              { value: 'income', label: 'Income', cls: 'text-earn' },
              { value: 'transfer', label: 'Transfer', cls: 'text-ink' },
            ].map((o) => (
              <button
                key={o.value}
                onClick={() => setMode(o.value)}
                className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all duration-200 ${
                  mode === o.value ? `bg-white shadow-card ${o.cls}` : 'text-muted'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {/* The amount is the hero — no card around it, nothing competing */}
        <div className="flex items-start justify-center gap-1.5 pt-3 pb-1">
          <span className={`tnum text-6xl font-bold tracking-tight transition-colors duration-200 ${
            value ? (isIncome ? 'text-earn' : 'text-ink') : 'text-slate-300'
          }`}>
            {amount || '0'}
          </span>
          <span className="mt-3 text-2xl font-normal text-muted">€</span>
        </div>

        <Numpad value={amount} onChange={setAmount} />

        {/* Which of my accounts this moves. Transfers need two. */}
        {myAccounts.length > 0 && (
          <div className={isTransfer ? 'grid grid-cols-2 gap-3' : ''}>
            <div>
              <label className="label">{isTransfer ? 'From' : isIncome ? 'Into' : 'Paid from'}</label>
              <select className="field" value={accountId || ''} onChange={(e) => setAccountId(e.target.value)}>
                {myAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            {isTransfer && (
              <div>
                <label className="label">To</label>
                <select className="field" value={toAccountId || ''} onChange={(e) => setToAccountId(e.target.value)}>
                  {myAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {isTransfer && (
          <p className="rounded-2xl bg-slate-50 p-3 text-sm text-muted">
            Moving money between your own accounts. It isn't spending, so it won't appear in
            expenses, categories or the shared split — only your balances change.
          </p>
        )}

        {!isIncome && !isTransfer && (
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
                value={categoryId || category}
                items={dbCategories.length ? dbCategories : (scope === 'business' ? BUSINESS_CATEGORIES : CATEGORIES)}
                onChange={(c) => {
                  if (typeof c === 'string') {
                    // Fallback list — no database categories loaded yet.
                    setCategoryId(null)
                    setCategory(c)
                    if (!editing && scope !== 'business') setSpendType(defaultSpendType(c))
                    return
                  }
                  // Store the exact choice, but keep `category` on the root name
                  // so every existing total keeps grouping the way it always has.
                  setCategoryId(c.id)
                  setCategory(c.parentName || c.name)
                  if (!editing && scope !== 'business') {
                    const st = c.spend_type || defaultSpendType(c.parentName || c.name)
                    setSpendType(st)
                  }
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
              Your fixed salary belongs in{' '}
              <Link to="/salary" className="text-brand-600 underline">Salary</Link>, not here — adding it in
              both places counts it twice. Use this for anything else that comes in.
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

        {!editing && !isTransfer && (
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

      {/* Sticky save bar — floats over the content rather than sitting behind
          a hard rule, so the page reads as one surface */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-surface via-surface to-transparent px-4 pb-1 pt-8 safe-bottom">
        <div className="mx-auto max-w-md">
          <button
            className={`btn w-full px-5 py-4 text-lg text-white shadow-fab ${isIncome ? 'bg-earn' : 'bg-brand-500'}`}
            disabled={busy || value <= 0}
            onClick={() => save()}
          >
            {busy ? 'Saving…' : editing ? `Update ${money(value)}` : isTransfer ? `Move ${money(value)}` : isIncome ? `Save income ${money(value)}` : `Save expense ${money(value)}`}
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
