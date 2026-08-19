import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounts } from '../hooks/useAccounts'
import { useHoldings } from '../hooks/useHoldings'
import { useSavings } from '../hooks/useSavings'
import { useNetWorthHistory } from '../hooks/useNetWorthHistory'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/TopBar'
import Donut from '../components/Donut'
import NetWorthChart from '../components/NetWorthChart'
import { Screen, Item, Tap, Counter, Sheet, motion } from '../components/motion'
import { money, isoDay } from '../lib/format'
import { t } from '../lib/i18n'
import { fetchQuotes } from '../lib/quotes'
// Savings, Tax and Simulators open as sheets from here now instead of
// navigating away — same components, still reachable at their own routes
// directly (a saved link still lands somewhere), just not how Wealth links
// to them any more.
import Savings from './Savings'
import Tax from './Tax'
import Simulators from './Simulators'

const RANGE_DAYS = { Week: 7, Month: 31, '3M': 92, '6M': 183, '1Y': 366, All: Infinity }

const num = (s) => parseFloat((String(s) || '0').replace(',', '.')) || 0

const ACCOUNT_KINDS = [
  { value: 'bank', label: t('Main account'), emoji: '🏦' },
  { value: 'savings', label: t('Savings account'), emoji: '🐷' },
  { value: 'cash', label: t('Cash'), emoji: '💶' },
  { value: 'card', label: t('Card'), emoji: '💳' },
]
const kindLabel = (k) => ACCOUNT_KINDS.find((x) => x.value === k)?.label || t('Account')
const kindEmoji = (k) => ACCOUNT_KINDS.find((x) => x.value === k)?.emoji || '🏦'

const SLICE_COLORS = ['#0f7a3e', '#6d8fd6', '#d946ef', '#ca8a04', '#0891b2', '#7c3aed', '#16a34a', '#db2777']

export default function Wealth() {
  const { hasBusiness } = useAuth()
  const { active: accounts, balances, total: liquid, loading: accountsLoading, add: addAccount } = useAccounts()
  const { assets, debts, assetsTotal, debtsTotal, loading, add: addHolding, update, remove } = useHoldings()
  // Net worth is liquid + assets − debts, and those come from two hooks that
  // resolve independently. Keying the counter on holdings alone meant that
  // whenever holdings won the race, the figure was declared "ready" while
  // `liquid` was still 0 — so it counted DOWN to a partial number first and
  // only then back up once accounts landed. Money appearing to drop on open
  // is the one thing this screen must never do.
  const figureReady = !loading && !accountsLoading
  const { goals, savedByGoal } = useSavings()
  const { rows: history, loading: historyLoading, recordToday } = useNetWorthHistory()

  const [hidden, setHidden] = useState(false)
  const [range, setRange] = useState('1Y')
  const [breakdown, setBreakdown] = useState(false)
  const [slice, setSlice] = useState(null)      // selected pie slice
  const [addOpen, setAddOpen] = useState(false)
  const [assetsOpen, setAssetsOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [sheet, setSheet] = useState(null) // 'savings' | 'tax' | 'simulators' | null

  const netWorth = liquid + assetsTotal - debtsTotal
  const gross = liquid + assetsTotal
  const pct = (v) => (gross > 0 ? Math.round((v / gross) * 100) : 0)
  const savedTotal = Object.values(savedByGoal).reduce((t, v) => t + Number(v || 0), 0)

  // What net worth is actually made of: every account by name, then every
  // asset. One slice per real thing, not per category — "Liquidity €7,452" tells
  // you nothing about which pot it sits in.
  const composition = useMemo(() => {
    const parts = [
      ...accounts.map((a) => ({ key: `a-${a.id}`, label: a.name, sub: kindLabel(a.kind), emoji: kindEmoji(a.kind), value: balances[a.id] ?? 0, group: 'liquid' })),
      ...assets.map((h) => ({ key: `h-${h.id}`, label: h.name, sub: t('Asset'), emoji: '📈', value: Number(h.value), group: 'assets', raw: h })),
    ].filter((p) => p.value > 0)
    return parts
      .sort((a, b) => b.value - a.value)
      .map((p, i) => ({ ...p, color: SLICE_COLORS[i % SLICE_COLORS.length] }))
  }, [accounts, balances, assets])

  const shown = slice ? composition.filter((c) => c.key === slice) : composition
  const money$ = (v) => (hidden ? '••••' : money(v))

  // Writes today's figure once everything has actually loaded, so a
  // half-loaded page never records a false low. Skipped if today is already
  // there — recordToday is safe to call repeatedly, but there's no reason to.
  //
  // This checked `loading` (holdings) only, which did NOT actually deliver
  // what that comment promises: if holdings resolved before accounts, it
  // wrote a snapshot with `liquid` still 0 — a permanently wrong low point
  // in the net-worth history, not just a flicker on screen.
  useEffect(() => {
    if (!figureReady) return
    const today = isoDay(new Date())
    if (history.some((h) => h.snapshot_date === today)) return
    recordToday({ liquid, assets: assetsTotal, debts: debtsTotal })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figureReady, liquid, assetsTotal, debtsTotal, history])

  const chartPoints = useMemo(() => {
    const days = RANGE_DAYS[range] ?? Infinity
    if (days === Infinity) return history
    const cutoff = isoDay(new Date(Date.now() - days * 86400000))
    return history.filter((h) => h.snapshot_date >= cutoff)
  }, [history, range])

  return (
    <div className="pb-28">
      <TopBar
        title={t('Wealth')}
        right={
          <Tap onClick={() => setAddOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white shadow-fab" aria-label={t('Add')}>
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
                  {t(r)}
                </button>
              ))}
            </div>
            <Tap onClick={() => setHidden(!hidden)} aria-label={hidden ? t('Show amounts') : t('Hide amounts')} className="ml-2 text-brand-700/70">
              {hidden ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.2A9.6 9.6 0 0112 5c5 0 9 4.5 9 7a11 11 0 01-2.2 3.3M6.2 6.2A11.6 11.6 0 003 12c0 2.5 4 7 9 7a9.9 9.9 0 003.6-.7" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
              )}
            </Tap>
          </div>

          <p className="label mb-0 mt-3 text-center text-brand-700/70">{t('Net worth')}</p>
          <Tap
            as="button"
            onClick={() => { setBreakdown(!breakdown); setSlice(null) }}
            className="mx-auto block"
          >
            <span className={`figure ${netWorth < 0 ? 'text-spend' : 'text-brand-700'}`}>
              {hidden ? '••••••' : <Counter id="wealth-net" ready={figureReady} value={netWorth} format={(n) => money(n)} />}
            </span>
          </Tap>
          <p className="mt-1 text-center text-xs text-brand-700/60">
            {breakdown ? t('Tap to close') : t('Tap to see what it’s made of')}
          </p>

          {chartPoints.length >= 2 ? (
            <div className="mt-3">
              <NetWorthChart points={hidden ? [] : chartPoints} />
              <div className="mt-1 flex justify-between text-[11px] text-brand-700/60">
                <span>{new Date(chartPoints[0].snapshot_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <span>{new Date(chartPoints[chartPoints.length - 1].snapshot_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
              </div>
            </div>
          ) : (
            // No history over this range yet — recorded once a day from today
            // on, so there is nothing to draw before it exists.
            <p className="mt-4 rounded-2xl bg-white/40 p-2.5 text-center text-xs text-brand-700/70">
              {historyLoading
                ? t('Loading…')
                : t('The chart fills in day by day from today — check back tomorrow.')}
            </p>
          )}
        </div>

        {/* Composition */}
        {breakdown && composition.length > 0 && (
          <Item className="card">
            <h2 className="label">{t("What it's made of")}</h2>
            <div className="my-3 flex justify-center">
              <Donut
                size={180}
                stroke={26}
                data={composition.map((c) => ({ label: c.label, value: c.value, color: c.color }))}
                total={gross}
                center={
                  <>
                    <span className="text-xs text-muted">{slice ? t('selected') : t('held')}</span>
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
                    <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ backgroundColor: c.color }} />
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
              <p className="mt-2 text-center text-xs text-muted">{t('Showing one holding — tap it again for all.')}</p>
            )}
          </Item>
        )}

        {loading && <p className="text-muted">{t('Loading…')}</p>}

        {/* Cash, assets, debts */}
        <Item className="card space-y-3">
          <Bar to="/accounts" emoji="🏦" title={t('Cash')}
            sub={accounts.length === 1 ? t('{n} account', { n: accounts.length }) : t('{n} accounts', { n: accounts.length })}
            value={money$(liquid)} pct={pct(liquid)} color="#0f7a3e" />
          <Bar onClick={() => setAssetsOpen(true)} emoji="📈" title={t('Assets')}
            sub={assets.length
              ? (assets.length === 1 ? t('{n} position', { n: assets.length }) : t('{n} positions', { n: assets.length }))
              : t('Nothing yet')}
            value={money$(assetsTotal)} pct={pct(assetsTotal)} color="#6d8fd6" />
          <Bar emoji="💳" title={t('Debts')} sub={debtsTotal > 0 ? t('{n} owed', { n: debts.length }) : t('No debts')}
            value={money$(debtsTotal)} pct={gross > 0 ? Math.min(100, Math.round((debtsTotal / gross) * 100)) : 0}
            color="#d24a3c" flat />
        </Item>

        {/* Quick links, as icons rather than full rows — salary already lives
            in Plan/Profile, so it doesn't need a second home here. Each opens
            a sheet instead of navigating to its own page. */}
        <Item className="flex justify-around py-1">
          <IconLink onClick={() => setSheet('savings')} emoji="🎯" label={t('Savings')} />
          {hasBusiness && <IconLink onClick={() => setSheet('tax')} emoji="🧾" label={t('Tax')} />}
          <IconLink onClick={() => setSheet('simulators')} emoji="🧮" label={t('Simulators')} />
        </Item>

        <p className="px-1 text-xs text-muted">
          {t('Holdings with a ticker and a number of units follow the market. Everything else is whatever you last typed.')}
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
            <h2 className="text-xl font-bold">{t('Assets')}</h2>
            <span className="tnum font-bold">{money$(assetsTotal)}</span>
          </div>

          {assets.length === 0 && <p className="py-8 text-center text-muted">{t('Nothing yet.')}</p>}

          <div className="card divide-y divide-slate-100 py-0">
            {assets.map((h) => (
              <Tap key={h.id} onClick={() => { setAssetsOpen(false); setEditing(h) }} className="flex w-full items-center gap-3 py-3 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">📈</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{h.name}</span>
                  {/* Which figures are the market's and which are yours. Without
                      this you cannot tell a live holding from a number typed in
                      months ago, and they look identical while one silently
                      goes stale. */}
                  {h.live ? (
                    <span className="block text-xs text-brand-600">
                      {t('{units} × {ticker} · live', { units: h.units, ticker: h.ticker })}
                    </span>
                  ) : (
                    (h.ticker || h.note) && <span className="block text-xs text-muted">{h.ticker || h.note}</span>
                  )}
                </span>
                <span className="tnum shrink-0 font-semibold">{money$(h.value)}</span>
              </Tap>
            ))}
          </div>

          <Tap className="btn-primary w-full" onClick={() => { setAssetsOpen(false); setAddOpen(true) }}>
            {t('+ Add an asset')}
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

      {/* Savings, Tax and Simulators — the full page, "almost full screen" as
          a sheet rather than a route. !px-0 because the embedded page brings
          its own TopBar + content padding; the sheet's own horizontal
          padding would double up with it. Vertical padding stays — the page
          doesn't bring its own (its outer div drops pb-28 when embedded). */}
      <Sheet open={sheet === 'savings'} onClose={() => setSheet(null)} className="!px-0 !max-h-[94vh]">
        {sheet === 'savings' && <Savings onClose={() => setSheet(null)} />}
      </Sheet>
      {/* Opens at half height — Tax is genuinely a lot to take in at once —
          with the expand control next to the handle for the full picture.
          The height change itself animates (Sheet's own layout animation),
          so it reads as a real expansion, not a snap. Closing (the back
          button inside Tax) still does the normal slide-down, back to
          Wealth underneath. */}
      <Sheet
        open={sheet === 'tax'}
        onClose={() => setSheet(null)}
        expandable
        className="!px-0 !max-h-[55vh]"
        expandedClassName="!px-0 !max-h-[94vh]"
      >
        {sheet === 'tax' && <Tax onClose={() => setSheet(null)} />}
      </Sheet>
      <Sheet open={sheet === 'simulators'} onClose={() => setSheet(null)} className="!px-0 !max-h-[94vh]">
        {sheet === 'simulators' && <Simulators onClose={() => setSheet(null)} />}
      </Sheet>
    </div>
  )
}

// A compact tap target — icon + label, nothing else. For a destination that
// doesn't need its own summary line here, three of these take the vertical
// space one full row used to.
function IconLink({ onClick, emoji, label }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 active:opacity-60">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-card">{emoji}</span>
      <span className="text-xs font-medium text-muted">{label}</span>
    </button>
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
  const [units, setUnits] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const options = [
    { key: 'savings', emoji: '🐷', title: t('Savings account'), sub: t('Money set aside in a bank') },
    { key: 'cash', emoji: '💶', title: t('Cash savings'), sub: t('Money you hold yourself') },
    { key: 'stock', emoji: '📈', title: t('Stocks'), sub: t('A holding you top up') },
  ]

  // Look the ticker up while you type it, so a typo shows itself here rather
  // than as a holding that silently never moves.
  const [livePrice, setLivePrice] = useState(null)
  const [lookingUp, setLookingUp] = useState(false)
  useEffect(() => {
    const tick = ticker.trim().toUpperCase()
    if (what !== 'stock' || tick.length < 1) { setLivePrice(null); setLookingUp(false); return }
    let alive = true
    setLookingUp(true)
    const timer = setTimeout(async () => {
      const q = await fetchQuotes([tick])
      if (!alive) return
      setLivePrice(q[tick] || null)
      setLookingUp(false)
    }, 500)
    return () => { alive = false; clearTimeout(timer) }
  }, [ticker, what])

  const submit = async () => {
    if (!name.trim()) { setErr(t('Give it a name.')); return }
    setBusy(true); setErr(null)
    // A ticker plus a number of units makes the holding track the market. With
    // only one of the two it stays a hand-typed figure — which is a legitimate
    // choice, not an error, so neither field is required.
    const tick = ticker.trim().toUpperCase()
    const unitCount = num(units)
    const tracked = tick && unitCount > 0
    const res = what === 'stock'
      ? await onHolding({
          kind: 'investment',
          name: name.trim(),
          value: tracked ? unitCount * (livePrice?.price || 0) : Math.abs(num(value)),
          ticker: tick || null,
          units: tracked ? unitCount : null,
          unit_price: tracked ? livePrice?.price ?? null : null,
          price_currency: tracked ? livePrice?.currency ?? null : null,
          priced_at: tracked && livePrice ? new Date().toISOString() : null,
          note: null,
        })
      : await onAccount({ name: name.trim(), kind: what === 'cash' ? 'cash' : 'savings', opening_balance: num(value) })
    setBusy(false)
    if (res?.error) { setErr(res.error.message || t('Could not save.')); return }
    onClose()
  }

  if (!what) {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-bold">{t('Add to net worth')}</h2>
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
        <label className="label">{t('Name')}</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)}
          placeholder={isStock ? t('e.g. S&P 500 fund') : what === 'cash' ? t('e.g. Cash at home') : t('e.g. Santander savings')} />
      </div>
      {isStock && (
        <>
          <div>
            <label className="label">{t('Ticker (optional)')}</label>
            <input className="field" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder={t('e.g. VUAA.L')} />
            {/* Said plainly, because a wrong suffix is the one thing that
                stops this working and it is invisible otherwise. */}
            <p className="mt-1 px-1 text-xs text-muted">
              {t('Use the exchange suffix — VUAA.L (London), VWCE.DE (Xetra), SAN.MC (Madrid). No suffix means a US listing.')}
            </p>
          </div>
          <div>
            <label className="label">{t('How many units')}</label>
            <input className="field" inputMode="decimal" value={units}
              onChange={(e) => setUnits(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder={t('e.g. 12')} />
          </div>
        </>
      )}
      {/* With a live price the value is worked out, not typed — typing it
          would only be a number that goes stale the moment you save. */}
      {!(isStock && livePrice && num(units) > 0) && (
        <div>
          <label className="label">{isStock ? t('What it is worth today') : t('Balance today')}</label>
          <input className="field" inputMode="decimal" value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0" />
        </div>
      )}
      {isStock && lookingUp && <p className="px-1 text-sm text-muted">{t('Looking up {ticker}…', { ticker: ticker.trim().toUpperCase() })}</p>}
      {isStock && !lookingUp && ticker.trim() && !livePrice && (
        <p className="px-1 text-sm text-muted">
          {t('No live price for that ticker — it will use the value you type. Check the exchange suffix.')}
        </p>
      )}
      {isStock && livePrice && (
        <div className="rounded-2xl bg-brand-50 px-4 py-3">
          <p className="text-sm text-muted">
            {t('{ticker} · {price} per unit', { ticker: ticker.trim().toUpperCase(), price: money(livePrice.price) })}
            {livePrice.rawCurrency !== livePrice.currency &&
              t(' (converted from {cur})', { cur: livePrice.rawCurrency })}
          </p>
          {num(units) > 0 && (
            <p className="text-xl font-bold">{money(num(units) * livePrice.price)}</p>
          )}
        </div>
      )}
      {err && <p className="text-sm text-spend">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Tap className="btn-ghost py-3 text-base" onClick={() => setWhat(null)}>{t('Back')}</Tap>
        <Tap className="btn-primary py-3 text-base" disabled={busy} onClick={submit}>{busy ? t('Saving…') : t('Add')}</Tap>
      </div>
    </div>
  )
}

function EditHolding({ holding, onClose, onSave, onDelete }) {
  const [name, setName] = useState(holding.name)
  const [value, setValue] = useState(String(holding.value))
  // Tickers used to be kept in `note` as a decorative label. Read from either
  // so holdings added before live pricing keep the symbol already typed.
  const [ticker, setTicker] = useState((holding.ticker || holding.note || '').toUpperCase())
  const [units, setUnits] = useState(holding.units != null ? String(holding.units) : '')
  const [confirm, setConfirm] = useState(false)
  const [livePrice, setLivePrice] = useState(null)
  const [lookingUp, setLookingUp] = useState(false)

  useEffect(() => {
    const tick = ticker.trim().toUpperCase()
    if (!tick) { setLivePrice(null); setLookingUp(false); return }
    let alive = true
    setLookingUp(true)
    const timer = setTimeout(async () => {
      const q = await fetchQuotes([tick])
      if (!alive) return
      setLivePrice(q[tick] || null)
      setLookingUp(false)
    }, 500)
    return () => { alive = false; clearTimeout(timer) }
  }, [ticker])

  const tick = ticker.trim().toUpperCase()
  const unitCount = num(units)
  const tracked = !!tick && !!livePrice && unitCount > 0

  const save = () =>
    onSave({
      name: name.trim() || holding.name,
      // A tracked holding's value is the market's answer, not a typed one.
      value: tracked ? unitCount * livePrice.price : Math.abs(num(value)),
      ticker: tick || null,
      units: tracked ? unitCount : null,
      unit_price: tracked ? livePrice.price : null,
      price_currency: tracked ? livePrice.currency : null,
      priced_at: tracked ? new Date().toISOString() : null,
      note: null,
    })

  return (
    <Sheet open onClose={onClose}>
      <div className="space-y-3">
        <h2 className="text-xl font-bold">{t('Update value')}</h2>
        <div>
          <label className="label">{t('Name')}</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('Ticker (optional)')}</label>
          <input className="field" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder={t('e.g. VUAA.L')} />
          <p className="mt-1 px-1 text-xs text-muted">
            {t('Use the exchange suffix — VUAA.L (London), VWCE.DE (Xetra), SAN.MC (Madrid). No suffix means a US listing.')}
          </p>
        </div>
        <div>
          <label className="label">{t('How many units')}</label>
          <input className="field" inputMode="decimal" value={units}
            onChange={(e) => setUnits(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder={t('e.g. 12')} />
        </div>
        {/* Once the market is answering, a typed value would only be a number
            going stale, so the field steps aside. */}
        {!tracked && (
          <div>
            <label className="label">{t('What it is worth today')}</label>
            <input className="field" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ''))} />
          </div>
        )}
        {lookingUp && <p className="px-1 text-sm text-muted">{t('Looking up {ticker}…', { ticker: tick })}</p>}
        {!lookingUp && tick && !livePrice && (
          <p className="px-1 text-sm text-muted">
            {t('No live price for that ticker — it will use the value you type. Check the exchange suffix.')}
          </p>
        )}
        {livePrice && (
          <div className="rounded-2xl bg-brand-50 px-4 py-3">
            <p className="text-sm text-muted">
              {t('{ticker} · {price} per unit', { ticker: tick, price: money(livePrice.price) })}
              {livePrice.rawCurrency !== livePrice.currency && t(' (converted from {cur})', { cur: livePrice.rawCurrency })}
            </p>
            {unitCount > 0 && <p className="text-xl font-bold">{money(unitCount * livePrice.price)}</p>}
          </div>
        )}
        <Tap className="btn-primary w-full" onClick={save}>{t('Save')}</Tap>
        {confirm ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800">{t('Remove “{name}” from your net worth?', { name: holding.name })}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Tap className="btn-ghost py-2.5 text-base" onClick={() => setConfirm(false)}>{t('Keep it')}</Tap>
              <Tap className="btn py-2.5 text-base bg-red-600 text-white" onClick={onDelete}>{t('Remove')}</Tap>
            </div>
          </div>
        ) : (
          <Tap className="btn-ghost w-full text-spend" onClick={() => setConfirm(true)}>{t('Remove')}</Tap>
        )}
      </div>
    </Sheet>
  )
}
