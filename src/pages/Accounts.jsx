import { useState } from 'react'
import { useAccounts } from '../hooks/useAccounts'
import TopBar from '../components/TopBar'
import Segmented from '../components/Segmented'
import { money } from '../lib/format'
import { t } from '../lib/i18n'

const num = (s) => parseFloat((s || '0').replace(',', '.')) || 0

const KINDS = [
  { value: 'cash', label: t('Cash'), emoji: '💶' },
  { value: 'bank', label: t('Bank'), emoji: '🏦' },
  { value: 'card', label: t('Card'), emoji: '💳' },
  { value: 'savings', label: t('Savings'), emoji: '🐷' },
]
const kindMeta = (k) => KINDS.find((x) => x.value === k) || KINDS[0]

export default function Accounts() {
  const { active, accounts, balances, total, loading, add, update, remove } = useAccounts()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)

  const inactive = accounts.filter((a) => !a.active)

  return (
    <div className="pb-28">
      <TopBar title={t('Accounts')} subtitle={t('Yours only — nobody else sees these')} back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        <div className="animate-fade-up rounded-xl3 bg-mint-200 p-5 text-center">
          <p className="label mb-0 text-brand-700/70">{t('Total across your accounts')}</p>
          <p className="figure mt-1 text-brand-700">{money(total)}</p>
        </div>

        {loading && <p className="text-muted">{t('Loading…')}</p>}

        <div className="space-y-2.5">
          {active.map((a) => {
            const m = kindMeta(a.kind)
            const bal = balances[a.id] ?? 0
            return (
              <button
                key={a.id}
                onClick={() => setEditing(a)}
                className="card-tap flex w-full items-center gap-3 text-left"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl">
                  {m.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{a.name}</span>
                  <span className="block text-sm text-muted">
                    {a.is_default ? t('{kind} · default', { kind: m.label }) : m.label}
                  </span>
                </span>
                <span className={`tnum shrink-0 font-bold ${bal < 0 ? 'text-spend' : ''}`}>{money(bal)}</span>
              </button>
            )
          })}
        </div>

        {!adding && (
          <button className="btn-ghost w-full" onClick={() => setAdding(true)}>{t('+ Add account')}</button>
        )}
        {adding && (
          <AccountForm
            onCancel={() => setAdding(false)}
            onSave={async (row) => { const { error } = await add(row); if (!error) setAdding(false); return error }}
          />
        )}

        {inactive.length > 0 && (
          <div className="card">
            <h2 className="label">{t('Closed')}</h2>
            <ul className="divide-y divide-slate-100">
              {inactive.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5">
                  <span className="text-muted line-through">{a.name}</span>
                  <button className="text-sm font-semibold text-brand-600" onClick={() => update(a.id, { active: true })}>
                    {t('Reopen')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {editing && (
          <EditSheet
            account={editing}
            balance={balances[editing.id] ?? 0}
            accountCount={active.length}
            onClose={() => setEditing(null)}
            onSave={async (row) => { await update(editing.id, row); setEditing(null) }}
            onDelete={async () => { await remove(editing.id); setEditing(null) }}
          />
        )}
      </div>
    </div>
  )
}

function AccountForm({ onSave, onCancel, initial }) {
  const [name, setName] = useState(initial?.name || '')
  const [kind, setKind] = useState(initial?.kind || 'bank')
  const [opening, setOpening] = useState(initial ? String(initial.opening_balance) : '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const submit = async () => {
    if (!name.trim()) { setErr(t('Give it a name.')); return }
    setBusy(true); setErr(null)
    const error = await onSave({ name: name.trim(), kind, opening_balance: num(opening) })
    setBusy(false)
    if (error) setErr(error.message || t('Could not save.'))
  }

  return (
    <div className="card space-y-3">
      <div>
        <label className="label">{t('Name')}</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('e.g. Santander')} />
      </div>
      <div>
        <label className="label">{t('Type')}</label>
        <Segmented options={KINDS.map((k) => ({ value: k.value, label: `${k.emoji} ${k.label}` }))} value={kind} onChange={setKind} />
      </div>
      <div>
        <label className="label">{t('Balance right now')}</label>
        <input
          className="field"
          inputMode="decimal"
          value={opening}
          onChange={(e) => setOpening(e.target.value.replace(/[^0-9.,-]/g, ''))}
          placeholder="0"
        />
        <p className="mt-1 text-xs text-muted">
          {t("What's in it today. Everything you log from here on adjusts it.")}
        </p>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button className="btn-ghost flex-1 py-3 text-base" onClick={onCancel}>{t('Cancel')}</button>
        <button className="btn-primary flex-1 py-3 text-base" disabled={busy} onClick={submit}>
          {busy ? t('Saving…') : t('Save')}
        </button>
      </div>
    </div>
  )
}

function EditSheet({ account, balance, accountCount, onClose, onSave, onDelete }) {
  const [name, setName] = useState(account.name)
  const [kind, setKind] = useState(account.kind)
  const [opening, setOpening] = useState(String(account.opening_balance))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isLast = accountCount <= 1

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 animate-fade-in" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-4 pb-8 animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
        <div className="mx-auto max-w-md space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold">{t('Edit account')}</h2>
            <span className={`tnum font-bold ${balance < 0 ? 'text-spend' : ''}`}>{money(balance)}</span>
          </div>

          <div>
            <label className="label">{t('Name')}</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('Type')}</label>
            <Segmented options={KINDS.map((k) => ({ value: k.value, label: `${k.emoji} ${k.label}` }))} value={kind} onChange={setKind} />
          </div>
          <div>
            <label className="label">{t('Starting balance')}</label>
            <input
              className="field"
              inputMode="decimal"
              value={opening}
              onChange={(e) => setOpening(e.target.value.replace(/[^0-9.,-]/g, ''))}
            />
          </div>

          <button
            className="btn-primary w-full"
            onClick={() => onSave({ name: name.trim() || account.name, kind, opening_balance: num(opening) })}
          >
            {t('Save')}
          </button>

          {!account.is_default && (
            <button className="btn-ghost w-full" onClick={() => onSave({ active: false })}>
              {t('Close this account')}
            </button>
          )}

          {!isLast && !account.is_default && (
            confirmDelete ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm font-medium text-red-800">
                  {t('Delete “{name}”? What you spent from it stays in your history — those entries just stop pointing at an account.', { name: account.name })}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button className="btn-ghost py-2.5 text-base" onClick={() => setConfirmDelete(false)}>{t('Keep it')}</button>
                  <button className="btn py-2.5 text-base bg-red-600 text-white" onClick={onDelete}>{t('Delete')}</button>
                </div>
              </div>
            ) : (
              <button className="btn-ghost w-full text-red-600" onClick={() => setConfirmDelete(true)}>
                {t('Delete account')}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
