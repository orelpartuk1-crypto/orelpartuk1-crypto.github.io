import { useNavigate } from 'react-router-dom'
import { Sheet } from './motion'
import { money, dayLabel } from '../lib/format'
import { categoryMeta } from '../lib/categories'

// The detail behind one line on the home screen. Everything about a movement in
// one place, including the receipt, so tapping a row answers "what was that?"
// without navigating away and losing your place.
export default function MovementSheet({ movement, accountName, nameOf, onClose, onReceipt }) {
  const nav = useNavigate()
  // Keep <Sheet> mounted at all times so its AnimatePresence never remounts —
  // remounting on every open used to skip the slide-up animation every single
  // time (AnimatePresence's initial={false} only means "don't animate what's
  // already there when I first appear", which was every single open when this
  // whole tree unmounted between them). Only the content below is guarded.
  const m = movement

  const isIncome = m?.direction === 'in'
  const meta = m ? (isIncome ? { emoji: '💰', color: '#0f7a3e' } : categoryMeta(m.category)) : null
  const canEdit = m?.type === 'expense' && m?.paid_by === m?.viewerId

  const rows = m
    ? [
        ['When', dayLabel(m.date)],
        m.category && ['Category', m.category],
        m.scope && ['Type', m.scope === 'shared' ? 'Shared' : m.scope === 'business' ? 'Business' : 'Private'],
        m.spend_type && m.scope !== 'business' && ['Need or treat', m.spend_type === 'treat' ? 'Treat' : 'Need'],
        accountName && ['Account', accountName],
        m.paid_by && nameOf && ['Paid by', nameOf(m.paid_by)],
        m.owed_amount > 0 && ['Owed back', money(m.owed_amount)],
      ].filter(Boolean)
    : []

  return (
    <Sheet open={!!m} onClose={onClose}>
      {m && (
      <div className="space-y-4">
        <div className="text-center">
          <span
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl"
            style={{ backgroundColor: meta.color + '22' }}
          >
            {meta.emoji}
          </span>
          <p className={`figure mt-3 ${isIncome ? 'text-earn' : 'text-ink'}`}>
            {isIncome ? '+' : '−'}{money(m.amount)}
          </p>
          <p className="mt-1 font-medium">{m.label}</p>
        </div>

        <div className="card divide-y divide-slate-100 py-0">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-3">
              <span className="text-sm text-muted">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>

        {Array.isArray(m.items) && m.items.length > 0 && (
          <div className="card">
            <h3 className="label">What was in it</h3>
            <ul className="divide-y divide-slate-100">
              {m.items.map((it, i) => (
                <li key={i} className="flex justify-between py-2 text-sm">
                  <span className="min-w-0 truncate">{it.name}</span>
                  <span className="tnum shrink-0 font-medium">{money(it.price)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {m.receipt_path ? (
            <button className="btn-ghost py-3 text-base" onClick={() => onReceipt(m.raw)}>🧾 Receipt</button>
          ) : (
            <span />
          )}
          {canEdit && (
            <button className="btn-primary py-3 text-base" onClick={() => nav('/add', { state: { edit: m.raw } })}>
              Edit
            </button>
          )}
        </div>
      </div>
      )}
    </Sheet>
  )
}
