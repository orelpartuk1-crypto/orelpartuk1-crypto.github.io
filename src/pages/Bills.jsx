import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMoney } from '../hooks/useMoney'
import Segmented from '../components/Segmented'
import TopBar from '../components/TopBar'
import { money } from '../lib/format'

const num = (s) => parseFloat((s || '0').replace(',', '.')) || 0

// Rent and the other standing bills. Deliberately NOT expenses: one person pays
// the whole thing and the other reimburses a share, so they feed the settle-up
// figure directly rather than showing up as a purchase in the expenses list.
export default function Bills() {
  const { members } = useAuth()
  const { bills, loading, saveBill, deleteBill } = useMoney()

  const total = bills.reduce((t, b) => t + Number(b.amount || 0), 0)

  return (
    <div className="pb-28">
      <TopBar title="Rent & bills" subtitle="Paid every month" back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        <div className="card">
          <p className="text-sm text-muted">
            One person pays the bill; the other reimburses their share each month. These feed the
            “settle up” figure on the dashboard — they don't appear in the expenses list.
          </p>
          {total > 0 && (
            <p className="mt-2 font-semibold">{money(total)} of standing bills every month</p>
          )}
        </div>

        {loading && <p className="text-muted">Loading…</p>}

        {bills.map((b) => (
          <BillRow key={b.id} bill={b} members={members} onSave={saveBill} onDelete={() => deleteBill(b.id)} />
        ))}

        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">Add a bill</h2>
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
    <div className={isNew ? 'space-y-2' : 'card space-y-2'}>
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
