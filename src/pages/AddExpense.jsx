import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useExpenses } from '../hooks/useExpenses'
import { useMoney } from '../hooks/useMoney'
import { useRecurring } from '../hooks/useRecurring'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'
import { useAllExpenses } from '../hooks/useAllExpenses'
import Segmented from '../components/Segmented'
import GrocerySelector from '../components/GrocerySelector'
import CategorySheet from '../components/CategorySheet'
import TopBar from '../components/TopBar'
import { Screen, Item, Tap, Sheet } from '../components/motion'
import { useKeyboardInset } from '../hooks/useKeyboardInset'
import { money, dayLabel, monthRange, isoDay } from '../lib/format'
import { defaultSpendType, categoryMeta, guessCategory, CATEGORIES, BUSINESS_CATEGORIES, SELF_EXPLANATORY } from '../lib/categories'
import { findDuplicate } from '../lib/dupCheck'
import { takePendingReceipt } from '../lib/pendingScan'
import { uploadReceipt } from '../lib/receipts'

const toNumber = (s) => parseFloat((s || '0').replace(',', '.')) || 0
const todayISO = () => isoDay(new Date())
const ACCOUNT_EMOJI = { cash: '💶', bank: '🏦', card: '💳', savings: '🐷' }


export default function AddExpense() {
  const nav = useNavigate()
  const location = useLocation()
  const keyboardInset = useKeyboardInset()
  const prefill = location.state?.prefill
  const editing = location.state?.edit
  const { user, household, hasBusiness, members } = useAuth()
  const { addExpense, updateExpense, deleteExpense } = useExpenses()
  const { addBonus } = useMoney()
  const { items: recurringItems, add: addRecurring } = useRecurring()
  const { active: myAccounts, defaultAccount, balances } = useAccounts()
  const { pickList } = useCategories()
  const { expenses: history } = useAllExpenses()

  const [claimedReceipt] = useState(() => (prefill ? takePendingReceipt() : null))
  const pendingReceipt = useRef(claimedReceipt)

  const isIncomeCapable = !editing
  const [mode, setMode] = useState('expense') // 'expense' | 'income'
  const isIncome = isIncomeCapable && mode === 'income'

  const seed = editing || prefill || {}
  const defaultScope = (() => {
    if (editing?.scope) return editing.scope
    if (prefill?.scope) return prefill.scope
    const z = localStorage.getItem('db_zone')
    if (z === 'business' && hasBusiness) return 'business'
    if (z === 'mine') return 'private'
    return 'shared'
  })()

  const [amount, setAmount] = useState(seed.amount ? String(seed.amount).replace('.', ',') : '')
  const [category, setCategory] = useState(seed.category || (defaultScope === 'business' ? 'Meeting' : 'Groceries'))
  const [categoryId, setCategoryId] = useState(editing?.category_id || prefill?.category_id || null)
  const [scope, setScope] = useState(defaultScope)
  const [spendType, setSpendType] = useState(editing?.spend_type || defaultSpendType(seed.category || 'Groceries'))
  const [items, setItems] = useState(
    Array.isArray(seed.items) ? seed.items.map((i) => ({ name: i.name, price: String(i.price ?? '').replace('.', ',') })) : []
  )
  const [note, setNote] = useState(seed.note || '')
  // Once you've picked a category yourself — by hand or via a shortcut — the
  // guesser backs off. It only fills in a category you haven't chosen yet.
  const [categoryTouched, setCategoryTouched] = useState(!!editing || !!seed.category)
  const [spentAt, setSpentAt] = useState(seed.date || editing?.spent_at || todayISO())
  const [repeats, setRepeats] = useState(false)
  const [accountId, setAccountId] = useState(editing?.account_id || prefill?.account_id || null)
  const [catOpen, setCatOpen] = useState(false)
  const [acctOpen, setAcctOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [dupWarn, setDupWarn] = useState(false)

  useEffect(() => {
    if (!accountId && defaultAccount) setAccountId(defaultAccount.id)
  }, [defaultAccount, accountId])

  const value = toNumber(amount)
  const catScope = isIncome ? 'income' : scope === 'business' ? 'business' : 'expense'
  const dbCategories = pickList(catScope)
  const fallback = scope === 'business' ? BUSINESS_CATEGORIES : CATEGORIES
  const catItems = dbCategories.length ? dbCategories : fallback
  const chosenCat = catItems.find((c) => (c.id ?? c.key) === (categoryId || category))
  const currentAccount = myAccounts.find((a) => a.id === accountId)

  // Shortcuts: what you actually log again and again. Your own monthly items
  // first, then anything the history shows you repeat — so the list is useful
  // on day one and gets better without you maintaining it.
  const shortcuts = useMemo(() => {
    const out = []
    for (const r of recurringItems.filter((r) => r.active && r.kind === 'expense')) {
      out.push({ key: `r-${r.id}`, label: r.name, amount: Number(r.amount), category: r.category, scope: r.scope, spend_type: r.spend_type, pinned: true })
    }
    const counts = new Map()
    for (const e of history) {
      const label = (e.note || '').trim()
      if (!label || e.paid_by !== user?.id) continue
      const k = `${label.toLowerCase()}|${e.category}`
      const prev = counts.get(k) || { n: 0, label, category: e.category, scope: e.scope, spend_type: e.spend_type, amounts: [] }
      prev.n += 1
      prev.amounts.push(Number(e.amount))
      counts.set(k, prev)
    }
    const frequent = [...counts.values()]
      .filter((c) => c.n >= 3 && !out.some((o) => o.label.toLowerCase() === c.label.toLowerCase()))
      .sort((a, b) => b.n - a.n)
      .slice(0, 6)
      .map((c) => ({
        key: `f-${c.label}`,
        label: c.label,
        // The amount you most often pay, not the average — an average of 8 and
        // 40 is a number you have never actually spent.
        amount: c.amounts.sort((a, b) => a - b)[Math.floor(c.amounts.length / 2)],
        category: c.category,
        scope: c.scope,
        spend_type: c.spend_type,
      }))
    return [...out.slice(0, 6), ...frequent].slice(0, 8)
  }, [recurringItems, history, user?.id])

  const applyShortcut = (s) => {
    setAmount(String(s.amount).replace('.', ','))
    setNote(s.label)
    setCategory(s.category)
    setCategoryId(null)
    setCategoryTouched(true)
    if (s.scope) setScope(s.scope)
    if (s.spend_type) setSpendType(s.spend_type)
  }

  // No manual split any more — needs are 50/50 by the default rule and treats
  // are each their own, which is what the settle-up figure already assumes.
  const owedAmount = null

  const scopeOptions = [
    { value: 'shared', label: '🤝 Together' },
    { value: 'private', label: '👤 Mine' },
    ...(hasBusiness ? [{ value: 'business', label: '💼 Business' }] : []),
  ]

  const changeScope = (s) => {
    if (s !== scope) setCategoryId(null)
    if (s === 'business' && scope !== 'business') setCategory('Meeting')
    else if (s !== 'business' && scope === 'business') {
      setCategory('Groceries')
      setSpendType(defaultSpendType('Groceries'))
    }
    setScope(s)
  }

  const pickCategory = (c) => {
    setCategoryTouched(true)
    if (typeof c === 'string' || c.key) {
      setCategoryId(null)
      setCategory(c.key ?? c)
      if (!editing && !isIncome && scope !== 'business') setSpendType(defaultSpendType(c.key ?? c))
      return
    }
    setCategoryId(c.id)
    setCategory(c.parentName || c.name)
    if (!editing && !isIncome && scope !== 'business') {
      setSpendType(c.spend_type || defaultSpendType(c.parentName || c.name))
    }
  }

  // Guess the category from what you typed — the same keyword list the
  // scanned-receipt flow uses, so a description and a receipt agree. Backs off
  // the moment you've chosen a category yourself.
  useEffect(() => {
    if (isIncome || categoryTouched || scope === 'business' || !note.trim()) return
    const guess = guessCategory(note)
    if (guess !== 'Other' && guess !== category) {
      setCategory(guess)
      setCategoryId(null)
      setSpendType(defaultSpendType(guess))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note])

  const needsDescription = !isIncome && !note.trim() && !SELF_EXPLANATORY.has(category)

  const save = async (force = false) => {
    if (value <= 0) return
    setErr(null)
    if (needsDescription) {
      setErr(`What was this ${category.toLowerCase()} for? Give it a name so you'll recognise it later.`)
      return
    }

    if (!isIncome && !editing && !force) {
      setBusy(true)
      const dup = await findDuplicate({ household_id: household?.id, paid_by: user?.id, spent_at: spentAt, category, amount: value })
      setBusy(false)
      if (dup) { setDupWarn(true); return }
    }

    setBusy(true)

    let recurringId = null
    if (repeats && !editing) {
      const payload = isIncome
        ? { kind: 'income', name: note.trim() || category, amount: value, source: category }
        : { kind: 'expense', name: note.trim() || category, amount: value, category, scope, spend_type: spendType }
      const { data: recRow, error: recErr } = await addRecurring(payload, { materialize: false })
      if (recErr) { setBusy(false); setErr(recErr.message); return }
      recurringId = recRow?.id ?? null
    }

    if (isIncome) {
      const { error } = await addBonus({
        amount: value,
        bonus_type: category,
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
      category_id: categoryId,
      scope,
      spend_type: spendType,
      paid_by: user?.id,
      owed_amount: owedAmount,
      note: note.trim() || null,
      spent_at: spentAt,
      account_id: accountId,
      ...(!editing ? { recurring_id: recurringId } : {}),
      items: (() => {
        const rows = items
          .filter((i) => i.name && i.name.trim())
          .map((i) => ({ name: i.name.trim(), price: parseFloat((String(i.price) || '0').replace(',', '.')) || 0 }))
        return rows.length ? rows : null
      })(),
    }

    const { data: saved, error } = editing ? await updateExpense(editing.id, row) : await addExpense(row)
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
    <div className="pb-36">
      <TopBar
        title={editing ? 'Edit' : isIncome ? 'New income' : 'New expense'}
        back
        right={
          !editing && !isIncome && (
            <Tap as={Link} to="/scan" className="flex h-10 items-center gap-1.5 rounded-full bg-white px-3 font-medium text-brand-600 shadow-card">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 8h3l2-2h6l2 2h3v11H4z" /><circle cx="12" cy="13" r="3.2" />
              </svg>
              Scan
            </Tap>
          )
        }
      />

      <Screen className="mx-auto max-w-md px-4 space-y-4">
        {isIncomeCapable && (
          <div className="flex rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.06]">
            {[
              { value: 'expense', label: 'Expense', cls: 'text-spend' },
              { value: 'income', label: 'Income', cls: 'text-earn' },
            ].map((o) => (
              <button
                key={o.value}
                onClick={() => { setMode(o.value); setCategoryId(null); setCategory(o.value === 'income' ? 'Salary' : 'Groceries') }}
                className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all duration-200 ${
                  mode === o.value ? `bg-white shadow-card ${o.cls}` : 'text-muted'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {/* Amount — a real input, so the phone's own keypad appears and the
            screen keeps the room a custom pad would have taken. */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <input
            className={`tnum w-full bg-transparent text-center text-6xl font-bold tracking-tight outline-none placeholder:text-slate-300 ${
              isIncome ? 'text-earn' : 'text-ink'
            }`}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, '').replace('.', ','))}
            placeholder="0"
            autoFocus={!editing}
            aria-label="Amount"
          />
          <span className="shrink-0 text-2xl text-muted">€</span>
        </div>

        {/* Shortcuts */}
        {!editing && shortcuts.length > 0 && (
          <div className="-mx-4 overflow-x-auto px-4">
            <div className="flex gap-2 pb-1">
              {shortcuts.map((s) => {
                const m = categoryMeta(s.category)
                return (
                  <Tap
                    key={s.key}
                    onClick={() => applyShortcut(s)}
                    className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-2 shadow-card"
                  >
                    <span className="text-base">{m.emoji}</span>
                    <span className="max-w-[9rem] truncate text-sm font-medium">{s.label}</span>
                    <span className="tnum text-sm text-muted">{money(s.amount)}</span>
                  </Tap>
                )
              })}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="label">
            What was it{!isIncome && !SELF_EXPLANATORY.has(category) ? '' : ' (optional)'}
          </label>
          <input
            className={`field ${needsDescription && err ? 'border-spend' : ''}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isIncome ? 'e.g. August invoice' : 'e.g. dentist, haircut, massage'}
          />
        </div>

        {/* Who it belongs to, and whether it was a choice */}
        {!isIncome && (
          <>
            <div>
              <label className="label">Whose is it</label>
              <Segmented options={scopeOptions} value={scope} onChange={changeScope} />
            </div>
            {scope !== 'business' && (
              <div>
                <label className="label">Need or treat</label>
                <Segmented
                  options={[{ value: 'need', label: '🧺 Need' }, { value: 'treat', label: '🍦 Treat' }]}
                  value={spendType}
                  onChange={setSpendType}
                />
              </div>
            )}
          </>
        )}

        {/* Category — opens its own screen */}
        <div>
          <label className="label">Category</label>
          <Tap onClick={() => setCatOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3.5 text-left dark:border-white/10">
            <span className="text-2xl">{chosenCat?.emoji || categoryMeta(category).emoji}</span>
            <span className="min-w-0 flex-1 truncate text-lg">{chosenCat?.name || chosenCat?.key || category}</span>
            <span className="text-muted">›</span>
          </Tap>
        </div>

        {/* Account — which pot this moves, so its balance stays honest. Only
            worth a tap when there's more than one to choose between. */}
        {currentAccount && (
          <div>
            <label className="label">Account</label>
            <Tap
              onClick={() => myAccounts.length > 1 && setAcctOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3.5 text-left dark:border-white/10"
            >
              <span className="text-2xl">{ACCOUNT_EMOJI[currentAccount.kind] || '🏦'}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg">{currentAccount.name}</span>
                <span className="block text-xs text-muted">Balance: {money(balances[currentAccount.id] ?? 0)}</span>
              </span>
              {myAccounts.length > 1 && <span className="text-muted">›</span>}
            </Tap>
          </div>
        )}

        {/* Date */}
        <div>
          <label className="label">Date</label>
          <input
            className="field"
            type="date"
            value={spentAt}
            max={todayISO()}
            onChange={(e) => setSpentAt(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted">{dayLabel(spentAt)}</p>
        </div>

        {category === 'Groceries' && !isIncome && (
          <GrocerySelector items={items} onChange={setItems} />
        )}

        {/* Repeats — a compact toggle row, not a full card. This is one
            option among several here, not a whole screen's worth of
            content, and didn't need the room of everything above it. */}
        {!editing && (
          <Tap
            as="div"
            onClick={() => setRepeats(!repeats)}
            className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-card"
          >
            <span className="text-lg">🔁</span>
            <span className="min-w-0 flex-1 font-medium">Repeats monthly</span>
            <span className={`flex h-6 w-10 shrink-0 items-center rounded-full px-0.5 transition ${repeats ? 'justify-end bg-brand-500' : 'justify-start bg-slate-200'}`}>
              <span className="h-5 w-5 rounded-full bg-white shadow" />
            </span>
          </Tap>
        )}

        {/* Bulk and filing — reachable, but this screen is for logging one
            expense, not for finding your way to a CSV importer. Collapsed
            by default keeps the room it used to take permanently. */}
        {!editing && (
          <details>
            <summary className="cursor-pointer list-none text-center text-sm font-semibold text-brand-600 marker:content-none">
              More ways to add expenses
            </summary>
            <div className="mt-2.5 space-y-2.5">
              <Tap as={Link} to="/import" className="card-tap flex w-full items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg">📄</span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-semibold">Import from bank</span>
                  <span className="block text-sm text-muted">CSV statement</span>
                </span>
                <span className="text-muted">›</span>
              </Tap>

              {scope === 'business' && (
                <Tap as={Link} to="/scan" className="card-tap flex w-full items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg">📦</span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block font-semibold">Scan and save to Dropbox</span>
                    <span className="block text-sm text-muted">Keeps the invoice for your gestor</span>
                  </span>
                  <span className="text-muted">›</span>
                </Tap>
              )}
            </div>
          </details>
        )}

        {err && <p className="text-sm text-spend">{err}</p>}

        {editing && (
          <Tap className="btn-ghost w-full text-spend" disabled={busy} onClick={remove}>Delete</Tap>
        )}
      </Screen>

      {/* Save — shifted above the keyboard on iOS, which otherwise leaves this
          exactly where it was and buries it (see useKeyboardInset). */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-surface via-surface to-transparent px-4 pb-1 pt-8 safe-bottom"
        style={keyboardInset ? { transform: `translateY(-${keyboardInset}px)` } : undefined}
      >
        <div className="mx-auto max-w-md">
          <Tap
            className={`btn w-full px-5 py-4 text-lg text-white shadow-fab ${isIncome ? 'bg-earn' : 'bg-brand-500'}`}
            disabled={busy || value <= 0}
            onClick={() => save()}
          >
            {busy ? 'Saving…' : editing ? `Update ${money(value)}` : isIncome ? `Save income ${money(value)}` : `Save ${money(value)}`}
          </Tap>
        </div>
      </div>

      <CategorySheet
        open={catOpen}
        onClose={() => setCatOpen(false)}
        items={catItems}
        value={categoryId || category}
        onPick={pickCategory}
        title={isIncome ? 'Where from' : 'Category'}
      />

      <Sheet open={acctOpen} onClose={() => setAcctOpen(false)}>
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Account</h2>
          <div className="space-y-2">
            {myAccounts.map((a) => (
              <Tap
                key={a.id}
                onClick={() => { setAccountId(a.id); setAcctOpen(false) }}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left ${
                  accountId === a.id ? 'border-brand-500 bg-brand-50' : 'border-black/5 bg-white dark:border-white/10'
                }`}
              >
                <span className="text-2xl">{ACCOUNT_EMOJI[a.kind] || '🏦'}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
                <span className="tnum text-sm text-muted">{money(balances[a.id] ?? 0)}</span>
              </Tap>
            ))}
          </div>
        </div>
      </Sheet>

      <Sheet open={dupWarn} onClose={() => setDupWarn(false)}>
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Possibly already logged</h2>
          <p className="text-muted">
            You already have {money(value)} for {category} on {dayLabel(spentAt)}. Add it anyway?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Tap className="btn-ghost py-3 text-base" onClick={() => setDupWarn(false)}>Cancel</Tap>
            <Tap className="btn-primary py-3 text-base" disabled={busy} onClick={() => { setDupWarn(false); save(true) }}>
              Add anyway
            </Tap>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
