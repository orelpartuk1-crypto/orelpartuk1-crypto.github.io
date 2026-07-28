import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMoney } from '../hooks/useMoney'
import Segmented from '../components/Segmented'
import TopBar from '../components/TopBar'
import { money, monthRange, monthLabel } from '../lib/format'

// Suggestions only — you can type any source (a client name, a product, etc.)
const BONUS_SOURCES = [
  'Freelance', 'Second job', 'Work bonus', 'Business', 'Business – product',
  'Business – service', 'Client', 'Sale', 'Commission', 'Investment', 'Refund', 'Gift',
]
const num = (s) => parseFloat((s || '0').replace(',', '.')) || 0

export default function Money() {
  const { profile, members, user, updateMonthlyIncome, hasBusiness, setHasBusiness } = useAuth()
  const { bonuses, bills, loading, addBonus, deleteBonus, saveBill, deleteBill } = useMoney()

  const [salary, setSalary] = useState(String(profile?.monthly_income ?? ''))
  const [savedSalary, setSavedSalary] = useState(false)
  useEffect(() => { setSalary(String(profile?.monthly_income ?? '')) }, [profile?.monthly_income])

  const partner = members.find((m) => m.id !== user?.id)
  const monthStart = monthRange(new Date()).start

  const saveSalary = async () => {
    await updateMonthlyIncome(num(salary))
    setSavedSalary(true)
    setTimeout(() => setSavedSalary(false), 1500)
  }

  // --- bonus form ---
  const [bAmount, setBAmount] = useState('')
  const [bType, setBType] = useState('')
  const addBonusRow = async () => {
    if (num(bAmount) <= 0) return
    await addBonus({ amount: num(bAmount), bonus_type: bType.trim() || 'Bonus', month: monthStart, note: null })
    setBAmount('')
    setBType('')
  }

  return (
    <div className="pb-28">
      <TopBar title="Income & bills" subtitle={monthLabel()} back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Salary */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">Your monthly salary</h2>
          <div className="flex gap-2">
            <input
              className="field flex-1"
              inputMode="decimal"
              value={salary}
              onChange={(e) => setSalary(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="e.g. 2200"
            />
            <button className="btn-primary px-5" onClick={saveSalary}>
              {savedSalary ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>

        {/* Business owner toggle */}
        <button
          onClick={() => setHasBusiness(!hasBusiness)}
          className={`card flex w-full items-center justify-between text-left active:scale-[0.99] ${hasBusiness ? 'ring-2 ring-brand-500' : ''}`}
        >
          <span className="flex items-center gap-3">
            <span className="text-2xl">💼</span>
            <span className="font-semibold">I own a business</span>
          </span>
          <span className={`flex h-7 w-12 items-center rounded-full px-0.5 transition ${hasBusiness ? 'bg-brand-500 justify-end' : 'bg-slate-200 justify-start'}`}>
            <span className="h-6 w-6 rounded-full bg-white shadow" />
          </span>
        </button>

        {/* Bonuses this month */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">Bonuses this month</h2>
          <div className="grid grid-cols-3 gap-2">
            <input
              className="field col-span-1"
              inputMode="decimal"
              value={bAmount}
              onChange={(e) => setBAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="€"
            />
            <input
              className="field col-span-2"
              list="bonus-sources"
              value={bType}
              onChange={(e) => setBType(e.target.value)}
              placeholder="Where from? e.g. Freelance"
            />
            <datalist id="bonus-sources">
              {BONUS_SOURCES.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <button className="btn-ghost w-full" onClick={addBonusRow}>+ Add bonus</button>

          {bonuses.filter((b) => b.owner === user?.id).length === 0 && (
            <p className="text-sm text-muted">No bonuses added this month.</p>
          )}
          <ul className="divide-y divide-slate-100">
            {bonuses.filter((b) => b.owner === user?.id).map((b) => (
              <li key={b.id} className="flex items-center justify-between py-2">
                <span className="font-medium">{b.bonus_type}</span>
                <span className="flex items-center gap-3">
                  <b>{money(b.amount)}</b>
                  <button onClick={() => deleteBonus(b.id)} className="text-slate-300 hover:text-red-500" aria-label="Delete">
                    <TrashIcon />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Rent / recurring bills */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">Rent & recurring bills</h2>
          <p className="text-sm text-muted">
            One person pays the bill; the other reimburses their share each month.
          </p>
          {loading && <p className="text-muted">Loading…</p>}
          {bills.map((b) => (
            <BillRow key={b.id} bill={b} members={members} onSave={saveBill} onDelete={() => deleteBill(b.id)} />
          ))}
          <BillRow members={members} onSave={saveBill} isNew />
        </div>
      </div>
    </div>
  )
}

function BillRow({ bill, members, onSave, onDelete, isNew }) {
  const [name, setName] = useState(bill?.name || 'Rent')
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '')
  const [payer, setPayer] = useState(bill?.payer || members[0]?.id)
  const [share, setShare] = useState(bill ? String(bill.other_share) : '')

  const other = members.find((m) => m.id !== payer)

  const save = async () => {
    if (num(amount) <= 0) return
    await onSave({
      id: bill?.id,
      name: name.trim() || 'Rent',
      amount: num(amount),
      payer,
      other_share: num(share),
      active: true,
    })
    if (isNew) { setName('Rent'); setAmount(''); setShare('') }
  }

  return (
    <div className="rounded-2xl border border-slate-100 p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rent" />
        <input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="Total €" />
      </div>
      <div>
        <label className="label">Who pays it?</label>
        <Segmented
          options={members.map((m) => ({ value: m.id, label: m.display_name }))}
          value={payer}
          onChange={setPayer}
        />
      </div>
      <div>
        <label className="label">{other ? `${other.display_name} reimburses (€)` : 'Other pays (€)'}</label>
        <input className="field" inputMode="decimal" value={share} onChange={(e) => setShare(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="e.g. 250" />
      </div>
      <div className="flex gap-2">
        <button className="btn-primary flex-1 py-3 text-base" onClick={save}>
          {isNew ? '+ Add bill' : 'Save'}
        </button>
        {!isNew && (
          <button className="btn-ghost px-4 py-3 text-red-600" onClick={onDelete}>Delete</button>
        )}
      </div>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    </svg>
  )
}
