import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounts } from '../hooks/useAccounts'
import { useHoldings } from '../hooks/useHoldings'
import { useSavings } from '../hooks/useSavings'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/TopBar'
import Donut from '../components/Donut'
import { Screen, Item, Tap, Counter, Sheet, motion } from '../components/motion'
import { money } from '../lib/format'

const num = (s) => parseFloat((String(s) || '0').replace(',', '.')) || 0

const ACCOUNT_KINDS = [
  { value: 'bank', label: 'Main account', emoji: '🏦' },
  { value: 'savings', label: 'Savings account', emoji: '🐷' },
  { value: 'cash', label: 'Cash', emoji: '💶' },
  { value: 'card', label: 'Card', emoji: '💳' },
]
const kindLabel = (k) => ACCOUNT_KINDS.find((x) => x.value === k)?.label || 'Account'
const kindEmoji = (k) => ACCOUNT_KINDS.find((x) => x.value === k)?.emoji || '🏦'

const SLICE_COLORS = ['#0f7a3e', '#6d8fd6', '#d946ef', '#ca8a04', '#0891b2', '#7c3aed', '#16a34a', '#db2777']

export default function Wealth() {
  const { profile } = useAuth()
  const { active: accounts, balances, total: liquid, add: addAccount } = useAccounts()
  const { assets, debts, assetsTotal, debtsTotal, loading, add: addHolding, update, remove } = useHoldings()
  const { goals, savedByGoal } = useSavings()

  const [hidden, setHidden] = useState(false)
  const [range, setRange] = useState('1Y')
  const [breakdown, setBreakdown] = useState(false)
  const [slice, setSlice] = useState(null)      // selected pie slice
  const [addOpen, setAddOpen] = useState(false)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const netWorth = liquid + assetsTotal - debtsTotal
  const gross = liquid + assetsTotal
  const pct = (v) => (gross > 0 ? Math.round((v / gross) * 100) : 0)
  const salary = Number(profile?.monthly_income ?? 0)
  const savedTotal = Object.values(savedByGoal).reduce((t, v) => t + Number(v || 0), 0)

  // What net worth is actually made of: every account by name, then every
  // asset. One slice per real thing, not per category — "Liquidity €7,452" tells
  // you nothing about which pot it sits in.
  const composition = useMemo(() => {
    const parts = [
      ...accounts.map((a) => ({ key: `a-${a.id}`, label: a.name, sub: kindLabel(a.kind), emoji: kindEmoji(a.kind), value: balances[a.id] ?? 0, group: 'liquid' })),
      ...assets.map((h) => ({ key: `h-${h.id}`, label: h.name, sub: 'Asset', emoji: '📈', value: Number(h.value), group: 'assets', raw: h })),
    ].filter((p) => p.value > 0)
    return parts
      .sort((a, b) => b.value - a.value)
      .map((p, i) => ({ ...p, color: SLICE_COLORS[i % SLICE_COLORS.length] }))
  }, [accounts, balances, assets])

  const shown = slice ? composition.filter((c) => c.key === slice) : composition
  const money$ = (v) => (hidden ? '••••' : money(v))

  return (
    <div className="pb-28">
      <TopBar
        title="Wealth"
        subtitle="Yours — not shared with anyone"
        right={
          <Tap onClick={() => setAddOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white shadow-fab" aria-label="Add">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </Tap>
        }
      />

      <Screen className="mx-auto max-w-md px-4 space-y-4">
        {/* Net worth */}
        <div className="rounded-xl3 bg-mint-200 p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-1 justify-center gap-1 text-xs font-semibold">
              {['Week', 'Month', '3M', '6M', '1Y', 'All'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-full px-2.5 py-1 transition ${range === r ? 'bg-white text-brand-700 shadow-card' : 'text-brand-700/60'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Tap onClick={() => setHidden(!hidden)} aria-label={hidden ? 'Show amounts' : 'Hide amounts'} className="ml-2 text-brand-700/70">
              {hidden ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.2A9.6 9.6 0 0112 5c5 0 9 4.5 9 7a11 11 0 01-2.2 3.3M6.2 6.2A11.6 11.6 0 003 12c0 2.5 4 7 9 7a9.9 9.9 0 003.6-.7" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </Tap>
          </div>

          <p className="label mb-0 mt-3 text-center text-brand-700/70">Net worth</p>
          <Tap
            as="button"
            onClick={() => { setBreakdown(!breakdown); setSlice(null) }}
            className="mx-auto block"
          >
            <span className={`figure ${netWorth < 0 ? 'text-spend' : 'text-brand-700'}`}>
              {hidden ? '••••••' : <Counter value={netWorth} format={(n) => money(n)} />}
            </span>
          </Tap>
          <p className="mt-1 text-center text-xs text-brand-700/60">
            {breakdown ? 'Tap to close' : 'Tap to see what it’s made of'}
          </p>

          {/* No net-worth history exists yet, so there is no honest line to draw. */}
          <p className="mt-4 rounded-2xl bg-white/40 p-2.5 text-center text-xs text-brand-700/70">
            Charts over {range} start once there's history — nothing is recorded before today.
          </p>
        </div>

        {/* Composition */}
        {breakdown && composition.length > 0 && (
          <Item className="card">
            <h2 className="label">What it's made of</h2>
            <div className="my-3 flex justify-center">
              <Donut
                size={180}
                stroke={26}
                data={composition.map((c) => ({ label: c.label, value: c.value, color: c.color }))}
                total={gross}
                center={
                  <>
                    <span className="text-xs text-muted">{slice ? 'selected' : 'held'}</span>
                    <span className="tnum text-lg font-bold">
                      {money$(slice ? composition.find((c) => c.key === slice)?.value || 0 : gross)}
                    </span>
                  </>
                }
              />
            </div>

            <div className="divide-y divide-slate-100">
              {composition.map((c) => {
                const on = slice === c.key
                return (
                  <Tap
                    key={c.key}
                    onClick={() => setSlice(on ? null : c.key)}
                    className={`flex w-full items-center gap-2.5 py-2.5 text-left transition ${slice && !on ? 'opacity-35' : ''}`}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.emoji} {c.label}</span>
                      <span className="block text-xs text-muted">{c.sub}</span>
                    </span>
                    <span className="tnum shrink-0 text-sm text-muted">{pct(c.value)}%</span>
                    <span className="tnum shrink-0 font-semibold">{money$(c.value)}</span>
                  </Tap>
                )
              })}
            </div>
            {slice && (
              <p className="mt-2 text-center text-xs text-muted">Showing one holding — tap it again for all.</p>
            )}
          </Item>
        )}

        {loading && <p className="text-muted">Loading…</p>}

        {/* Cash, assets, debts */}
        <Item className="card space-y-3">
          <Bar to="/accounts" emoji="🏦" title="Cash" sub={`${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
            value={money$(liquid)} pct={pct(liquid)} color="#0f7a3e" />
          <Bar onClick={() => setAssetsOpen(true)} emoji="📈" title="Assets"
            sub={assets.length ? `${assets.length} position${assets.length === 1 ? '' : 's'}` : 'Nothing yet'}
            value={money$(assetsTotal)} pct={pct(assetsTotal)} color="#6d8fd6" />
          <Bar emoji="💳" title="Debts" sub={debtsTotal > 0 ? `${debts.length} owed` : 'No debts'}
            value={money$(debtsTotal)} pct={gross > 0 ? Math.min(100, Math.round((debtsTotal / gross) * 100)) : 0}
            color="#d24a3c" flat />
        </Item>

        <Item className="space-y-2.5">
          <Link to="/salary" className="card-tap flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span className="text-2xl">💶</span>
              <span>
                <span className="block font-semibold">Salary</span>
                <span className="block text-sm text-muted">{salary > 0 ? `${money$(salary)} a month` : 'Not set yet'}</span>
              </span>
            </span>
            <span className="text-muted">›</span>
          </Link>
          <Link to="/savings" className="card-tap flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <span>
                <span className="block font-semibold">Savings goals</span>
                <span className="block text-sm text-muted">
                  {goals.length ? `${goals.length} goal${goals.length === 1 ? '' : 's'} · ${money$(savedTotal)}` : 'No goals yet'}
                </span>
              </span>
            </span>
            <span className="text-muted">›</span>
          </Link>
          <Link to="/simulators" className="card-tap flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span className="text-2xl">🧮</span>
              <span>
                <span className="block font-semibold">Simulators</span>
                <span className="block text-sm text-muted">Loan, house, retirement, inflation</span>
              </span>
            </span>
            <span className="text-muted">›</span>
          </Link>
        </Item>

        <p className="px-1 text-xs text-muted">
          Asset values are whatever you last typed — nothing here tracks live prices.
        </p>
      </Screen>

      {/* Add to net worth */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)}>
        <AddToWealth
          onClose={() => setAddOpen(false)}
          onAccount={(row) => addAccount(row)}
          onHolding={(row) => addHolding(row)}
        />
      </Sheet>

      {/* Assets list */}
      <Sheet open={assetsOpen} onClose={() => setAssetsOpen(false)}>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold">Assets</h2>
            <span className="tnum font-bold">{money$(assetsTotal)}</span>
          </div>

          {assets.length === 0 && <p className="py-8 text-center text-muted">Nothing yet.</p>}

          <div className="card divide-y divide-slate-100 py-0">
            {assets.map((h) => (
              <Tap key={h.id} onClick={() => { setAssetsOpen(false); setEditing(h) }} className="flex w-full items-center gap-3 py-3 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">📈</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{h.name}</span>
                  {h.note && <span className="block text-xs text-muted">{h.note}</span>}
                </span>
                <span className="tnum shrink-0 font-semibold">{money$(h.value)}</span>
              </Tap>
            ))}
          </div>

          <Tap className="btn-primary w-full" onClick={() => { setAssetsOpen(false); setAddOpen(true) }}>
            + Add an asset
          </Tap>
        </div>
      </Sheet>

      {editing && (
        <EditHolding
          holding={editing}
          onClose={() => setEditing(null)}
          onSave={async (row) => { await update(editing.id, row); setEditing(null) }}
          onDelete={async () => { await remove(editing.id); setEditing(null) }}
        />
      )}
    </div>
  )
}

function Bar({ to, onClick, emoji, title, sub, value, pct, color, flat }) {
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">{emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="block text-xs text-muted">{sub}</span>
        </span>
        <span className="tnum shrink-0 font-bold">{value}</span>
        {!flat && <span className="shrink-0 text-muted">›</span>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
        </div>
        <span className="tnum w-10 shrink-0 text-right text-xs text-muted">{pct}%</span>
      </div>
    </>
  )
  if (flat) return <div>{inner}</div>
  if (to) return <Link to={to} className="block active:opacity-60">{inner}</Link>
  return <button onClick={onClick} className="block w-full text-left active:opacity-60">{inner}</button>
}

function AddToWealth({ onClose, onAccount, onHolding }) {
  const [what, setWhat] = useState(null) // 'savings' | 'cash' | 'stock'
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [ticker, setTicker] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const options = [
    { key: 'savings', emoji: '🐷', title: 'Savings account', sub: 'Money set aside in a bank' },
    { key: 'cash', emoji: '💶', title: 'Cash savings', sub: 'Money you hold yourself' },
    { key: 'stock', emoji: '📈', title: 'Stocks', sub: 'A holding you top up' },
  ]

  const submit = async () => {
    if (!name.trim()) { setErr('Give it a name.'); return }
    setBusy(true); setErr(null)
    const res = what === 'stock'
      ? await onHolding({ kind: 'investment', name: name.trim(), value: Math.abs(num(value)), note: ticker.trim() || null })
      : await onAccount({ name: name.trim(), kind: what === 'cash' ? 'cash' : 'savings', opening_balance: num(value) })
    setBusy(false)
    if (res?.error) { setErr(res.error.message || 'Could not save.'); return }
    onClose()
  }

  if (!what) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-bold">Add to net worth</h2>
        {options.map((o) => (
          <Tap key={o.key} onClick={() => setWhat(o.key)} className="card-tap flex w-full items-center gap-3 text-left">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl">{o.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{o.title}</span>
              <span className="block text-sm text-muted">{o.sub}</span>
            </span>
            <span className="text-muted">›</span>
          </Tap>
        ))}
      </div>
    )
  }

  const isStock = what === 'stock'
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">{options.find((o) => o.key === what).title}</h2>
      <div>
        <label className="label">Name</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)}
          placeholder={isStock ? 'e.g. S&P 500 fund' : what === 'cash' ? 'e.g. Cash at home' : 'e.g. Santander savings'} />
      </div>
      {isStock && (
        <div>
          <label className="label">Ticker (optional)</label>
          <input className="field" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="e.g. VUAA" />
        </div>
      )}
      <div>
        <label className="label">{isStock ? 'What it is worth today' : 'Balance today'}</label>
        <input className="field" inputMode="decimal" value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0" />
      </div>
      {err && <p className="text-sm text-spend">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Tap className="btn-ghost py-3 text-base" onClick={() => setWhat(null)}>Back</Tap>
        <Tap className="btn-primary py-3 text-base" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Add'}</Tap>
      </div>
    </div>
  )
}

function EditHolding({ holding, onClose, onSave, onDelete }) {
  const [name, setName] = useState(holding.name)
  const [value, setValue] = useState(String(holding.value))
  const [note, setNote] = useState(holding.note || '')
  const [confirm, setConfirm] = useState(false)

  return (
    <Sheet open onClose={onClose}>
      <div className="space-y-3">
        <h2 className="text-xl font-bold">Update value</h2>
        <div>
          <label className="label">Name</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Ticker (optional)</label>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value.toUpperCase())} />
        </div>
        <div>
          <label className="label">What it is worth today</label>
          <input className="field" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ''))} />
        </div>
        <Tap className="btn-primary w-full" onClick={() => onSave({ name: name.trim() || holding.name, value: Math.abs(num(value)), note: note.trim() || null })}>
          Save
        </Tap>
        {confirm ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800">Remove “{holding.name}” from your net worth?</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Tap className="btn-ghost py-2.5 text-base" onClick={() => setConfirm(false)}>Keep it</Tap>
              <Tap className="btn py-2.5 text-base bg-red-600 text-white" onClick={onDelete}>Remove</Tap>
            </div>
          </div>
        ) : (
          <Tap className="btn-ghost w-full text-spend" onClick={() => setConfirm(true)}>Remove</Tap>
        )}
      </div>
    </Sheet>
  )
}
