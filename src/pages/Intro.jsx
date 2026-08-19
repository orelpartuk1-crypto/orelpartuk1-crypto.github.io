import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccounts } from '../hooks/useAccounts'
import { useHoldings } from '../hooks/useHoldings'
import { useRecurring } from '../hooks/useRecurring'
import { useIntro } from '../hooks/useIntro'
import { money } from '../lib/format'
import { t } from '../lib/i18n'
import { Tap, Counter, Sheet, motion, AnimatePresence } from '../components/motion'

const num = (s) => parseFloat((String(s) || '0').replace(',', '.')) || 0
const uid = () => Math.random().toString(36).slice(2, 9)

// A guided set-up: one topic per screen, each answer going somewhere real
// (accounts, holdings, recurring income) rather than into a survey table
// nobody reads.
//
// Shaped around a running net-worth total pinned to the header: every account,
// asset and debt you add moves it immediately, so the questions visibly build
// toward something instead of feeling like a form. That, rather than the step
// count, is what makes this worth doing at all.
//
// Never opens itself — Home offers it and this is where "yes" goes.
export default function Intro() {
  const nav = useNavigate()
  const { add: addAccount } = useAccounts()
  const { add: addHolding } = useHoldings()
  const { add: addRecurring } = useRecurring()
  const { finish, snooze, row } = useIntro()

  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)

  // Everything is held here and written once at the end, so backing up and
  // changing your mind never leaves half-created accounts behind.
  const [accounts, setAccounts] = useState([])
  const [assets, setAssets] = useState([])
  const [debts, setDebts] = useState([])
  const [income, setIncome] = useState(row?.monthly_income ? String(row.monthly_income) : '')
  const [spend, setSpend] = useState('')
  const [saveSalary, setSaveSalary] = useState(true)
  const [payday, setPayday] = useState(1)
  const [adding, setAdding] = useState(null) // 'accounts' | 'assets' | 'debts'

  const sum = (rows) => rows.reduce((a, r) => a + num(r.amount), 0)
  const netWorth = sum(accounts) + sum(assets) - sum(debts)
  const monthlySaving = Math.max(0, num(income) - num(spend))

  const steps = useMemo(() => {
    const base = ['welcome', 'accounts', 'assets', 'debts', 'rhythm']
    if (num(income) > 0 && saveSalary) base.push('payday')
    base.push('reveal')
    return base
  }, [income, saveSalary])

  const last = steps.length - 1
  const key = steps[Math.min(step, last)]

  const go = (d) => {
    setDir(d)
    setStep((s) => Math.min(last, Math.max(0, s + d)))
  }

  const complete = async () => {
    setBusy(true)
    for (const a of accounts) {
      if (num(a.amount) === 0 && !a.name) continue
      await addAccount({
        name: a.name || t('Cash and accounts'),
        kind: a.kind || 'bank',
        opening_balance: num(a.amount),
        is_default: accounts.indexOf(a) === 0,
      })
    }
    for (const a of assets) {
      await addHolding({ kind: 'investment', name: a.name || t('Investments'), value: num(a.amount), note: a.note || null })
    }
    for (const d of debts) {
      await addHolding({ kind: 'debt', name: d.name || t('Debts'), value: num(d.amount) })
    }
    // A salary you told us about is a real recurring item, not just a number
    // on your profile — that's what makes it appear under "Coming up", on the
    // day you actually said.
    if (num(income) > 0 && saveSalary) {
      await addRecurring(
        { kind: 'income', name: t('Salary'), amount: num(income), source: t('Salary'), day_of_month: payday },
        { materialize: false }
      )
    }
    await finish({
      ...(num(income) > 0 ? { monthly_income: num(income) } : {}),
      ...(num(spend) > 0 ? { monthly_spend_estimate: num(spend) } : {}),
    })
    setBusy(false)
    nav('/')
  }

  const later = async () => { await snooze(7); nav('/') }

  const listFor = { accounts, assets, debts }[adding] || []
  const setListFor = { accounts: setAccounts, assets: setAssets, debts: setDebts }[adding]

  return (
    // Plain document flow, no fixed footer: a sticky bottom bar plus the iOS
    // keyboard is what made this screen collapse on itself when a field was
    // focused. The page simply scrolls, which the keyboard has always
    // handled correctly on its own.
    <div className="min-h-full pb-10">
      <div className="safe-top sticky top-0 z-20 bg-surface px-4 pb-3">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3">
            {/* Back just leaves. It used to double as "not now" and snooze the
                whole questionnaire for a week — an invisible, week-long
                consequence for tapping the one control everybody taps to go
                back. Only the explicit "Not now" button snoozes. */}
            <Tap
              onClick={() => (step === 0 ? nav('/') : go(-1))}
              aria-label={t('Back')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </Tap>
            <div className="flex flex-1 gap-1.5">
              {steps.map((s, i) => (
                <motion.span
                  key={s}
                  className="h-1.5 flex-1 rounded-full bg-slate-200"
                  animate={{ backgroundColor: i <= step ? 'rgb(var(--c-brand-500))' : 'rgb(var(--c-n-200))' }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
          </div>

          {/* The number the whole flow is building. Present from the second
              screen on, and it moves the instant you add anything. */}
          <AnimatePresence initial={false}>
            {step > 0 && key !== 'reveal' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden text-center"
              >
                <p className="label mb-0 pt-3">{t('Your net worth')}</p>
                <p className="tnum text-xl font-bold">
                  <Counter id="intro-running" value={netWorth} format={(n) => money(n)} duration={450} />
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            initial={{ opacity: 0, x: dir * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -28 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4 pt-4"
          >
            {key === 'welcome' && (
              <Step
                guide={t('Five minutes now, and every screen has your real numbers in it.')}
                eyebrow={t('Getting to know you')}
                title={t('A few questions, then the app is yours')}
                blurb={t('You can skip any of them, and change all of them later.')}
              >
                <div className="py-10 text-center text-7xl">👋</div>
              </Step>
            )}

            {key === 'accounts' && (
              <Step
                guide={t('Now the important bit. Where do you keep your money?')}
                eyebrow={t('Your accounts')}
                title={t('How much do you have right now?')}
                blurb={t('Bank, savings or cash. This is the first brick of your number.')}
              >
                <ItemList
                  rows={accounts}
                  onRemove={(id) => setAccounts((r) => r.filter((x) => x.id !== id))}
                  emptyIcon="🏦"
                />
                <AddButton label={accounts.length ? t('Add another account') : t('Add an account')} onClick={() => setAdding('accounts')} />
              </Step>
            )}

            {key === 'assets' && (
              <Step
                guide={t('And is any of it invested? Shares, funds, crypto…')}
                eyebrow={t('Your assets')}
                title={t('Any investments or property?')}
                blurb={t('Shares, ETFs, crypto, a flat — anything that holds value.')}
              >
                <ItemList
                  rows={assets}
                  onRemove={(id) => setAssets((r) => r.filter((x) => x.id !== id))}
                  emptyIcon="📈"
                />
                <AddButton label={assets.length ? t('Add another asset') : t('Add an asset')} onClick={() => setAdding('assets')} />
              </Step>
            )}

            {key === 'debts' && (
              <Step
                guide={t('Now what you owe. This counts too, and you are going to have it in view.')}
                eyebrow={t('What you owe')}
                title={t('Mortgage or loans?')}
                blurb={t('Mortgage, loans, cards… add whatever you owe.')}
              >
                <ItemList
                  rows={debts}
                  onRemove={(id) => setDebts((r) => r.filter((x) => x.id !== id))}
                  emptyIcon="💳"
                  negative
                />
                <AddButton label={debts.length ? t('Add another debt') : t('Add a debt')} onClick={() => setAdding('debts')} />
              </Step>
            )}

            {key === 'rhythm' && (
              <Step
                guide={t('Two numbers and I can show you where you are heading.')}
                eyebrow={t('Your monthly rhythm')}
                title={t('Last stop: what comes in and what goes out?')}
              >
                <Field label={t('How much comes in each month?')} hint={t('Salary and other income')} value={income} onChange={setIncome} />
                <Field label={t('And roughly how much goes out?')} value={spend} onChange={setSpend} />
                {num(income) > 0 && num(spend) > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-sm font-medium text-brand-600"
                  >
                    {t('That leaves about {v} a month.', { v: money(monthlySaving) })}
                  </motion.p>
                )}
                {num(income) > 0 && (
                  <ToggleRow
                    icon="🔁"
                    label={t('Save my salary as recurring income')}
                    on={saveSalary}
                    onClick={() => setSaveSalary((v) => !v)}
                  />
                )}
              </Step>
            )}

            {key === 'payday' && (
              <Step
                guide={t('One last thing, so I know when to expect it.')}
                eyebrow={t('Your monthly rhythm')}
                title={t('What day does it arrive?')}
                blurb={t('So "Coming up" knows when to expect it, instead of assuming the 1st.')}
              >
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <Tap
                      key={d}
                      onClick={() => setPayday(d)}
                      className={`tnum h-10 rounded-xl text-sm font-semibold transition-colors ${
                        payday === d ? 'bg-brand-500 text-white shadow-fab' : 'bg-white text-muted shadow-card'
                      }`}
                    >
                      {d}
                    </Tap>
                  ))}
                </div>
                {payday > 28 && (
                  <p className="text-center text-xs text-muted">{t('In shorter months this moves to the last day.')}</p>
                )}
              </Step>
            )}

            {key === 'reveal' && (
              <Reveal netWorth={netWorth} monthlySaving={monthlySaving} />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 space-y-2">
          {step === last ? (
            <Tap className="btn-primary w-full" disabled={busy} onClick={complete}>
              {busy ? t('Saving…') : t('Start using it')}
            </Tap>
          ) : (
            <Tap className="btn-primary w-full" onClick={() => go(1)}>
              {step === 0 ? t('Let’s go') : t('Continue')}
            </Tap>
          )}
          {step === 0 && (
            <Tap className="w-full py-2 text-center text-sm font-semibold text-muted" onClick={later}>
              {t('Not now')}
            </Tap>
          )}
          {(key === 'assets' || key === 'debts') && (
            <Tap className="w-full py-2 text-center text-sm font-semibold text-muted" onClick={() => go(1)}>
              {key === 'assets' ? t("I don't have investments") : t('No debts')}
            </Tap>
          )}
          {key === 'rhythm' && (
            <Tap className="w-full py-2 text-center text-sm font-semibold text-muted" onClick={() => { setIncome(''); setSpend(''); go(1) }}>
              {t('I’d rather not say')}
            </Tap>
          )}
        </div>
      </div>

      <AddSheet
        kind={adding}
        onClose={() => setAdding(null)}
        onAdd={(item) => { setListFor?.((r) => [...r, { id: uid(), ...item }]); setAdding(null) }}
        existing={listFor}
      />
    </div>
  )
}

// The mascot's line, then the section, then the question — the order the
// reference uses, and it reads as being walked through rather than surveyed.
function Step({ guide, eyebrow, title, blurb, children }) {
  return (
    <>
      {guide && (
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 text-2xl">🤖</span>
          <p className="pt-1 text-sm text-muted">{guide}</p>
        </div>
      )}
      {eyebrow && <p className="text-center text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
      {title && <h1 className="text-center text-2xl font-bold leading-tight tracking-tight">{title}</h1>}
      {blurb && <p className="text-center text-sm text-muted">{blurb}</p>}
      {children}
    </>
  )
}

// What you've added so far, with a running tally underneath — the thing that
// makes adding a second account feel like progress rather than more work.
function ItemList({ rows, onRemove, emptyIcon, negative }) {
  const total = rows.reduce((a, r) => a + num(r.amount), 0)
  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {rows.map((r) => (
          <motion.div
            key={r.id}
            layout
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="card flex items-center gap-3 !py-3"
          >
            <span className="text-xl">{r.icon || emptyIcon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{r.name}</span>
              {r.note && <span className="block text-xs text-muted">{r.note}</span>}
            </span>
            <span className={`tnum shrink-0 font-semibold ${negative ? 'text-spend' : ''}`}>
              {negative ? '−' : ''}{money(num(r.amount))}
            </span>
            <Tap onClick={() => onRemove(r.id)} aria-label={t('Remove')} className="shrink-0 text-slate-300">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </Tap>
          </motion.div>
        ))}
      </AnimatePresence>
      {rows.length > 0 && (
        <motion.p layout className="text-center text-sm font-semibold text-brand-600">
          {t('That’s {v} so far', { v: money(total) })}
        </motion.p>
      )}
    </div>
  )
}

function AddButton({ label, onClick }) {
  return (
    <Tap onClick={onClick} className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-brand-50 py-3.5 text-sm font-semibold text-brand-700">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      {label}
    </Tap>
  )
}

function ToggleRow({ icon, label, on, onClick }) {
  return (
    <Tap as="div" onClick={onClick} className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-card">
      <span className="text-lg">{icon}</span>
      <span className="min-w-0 flex-1 font-medium">{label}</span>
      <span className={`flex h-6 w-10 shrink-0 items-center rounded-full px-0.5 transition ${on ? 'justify-end bg-brand-500' : 'justify-start bg-slate-200'}`}>
        <span className="h-5 w-5 rounded-full bg-white shadow" />
      </span>
    </Tap>
  )
}

function Field({ label, hint, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="field flex items-center gap-2">
        <span className="shrink-0 text-xl text-muted">€</span>
        <input
          className="tnum min-w-0 flex-1 bg-transparent text-2xl font-bold outline-none placeholder:text-slate-300"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, '').replace('.', ','))}
          placeholder="0"
        />
      </div>
      {hint && <p className="mt-1 text-center text-xs text-muted">{hint}</p>}
    </div>
  )
}

const ACCOUNT_KINDS = [
  { value: 'bank', label: '🏦', name: 'Bank' },
  { value: 'savings', label: '🐷', name: 'Savings' },
  { value: 'cash', label: '💶', name: 'Cash' },
  { value: 'card', label: '💳', name: 'Card' },
]

const ASSET_KINDS = [
  { icon: '📈', name: 'Shares' },
  { icon: '🪙', name: 'Crypto' },
  { icon: '🏠', name: 'Property' },
  { icon: '📊', name: 'Fund' },
]

const DEBT_KINDS = [
  { icon: '🏠', name: 'Mortgage' },
  { icon: '🏦', name: 'Loan' },
  { icon: '💳', name: 'Card' },
]

// One sheet for all three, because "name it, say what it's worth" is the same
// question whether it's an account, a holding or a debt. Presets fill the name
// in one tap so the common cases need no typing at all.
function AddSheet({ kind, onClose, onAdd, existing = [] }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [icon, setIcon] = useState(null)
  const [accountKind, setAccountKind] = useState('bank')
  // Shares can be entered as a total, or as quantity × price if that's how you
  // hold the number in your head. Both end up as one value.
  const [byUnits, setByUnits] = useState(false)
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('')

  const presets = kind === 'accounts' ? ACCOUNT_KINDS : kind === 'assets' ? ASSET_KINDS : DEBT_KINDS
  const computed = byUnits ? num(qty) * num(unit) : num(amount)
  const canSave = !!name.trim() && computed > 0

  const reset = () => { setName(''); setAmount(''); setIcon(null); setByUnits(false); setQty(''); setUnit(''); setAccountKind('bank') }

  const title = kind === 'accounts' ? t('Add an account') : kind === 'assets' ? t('Add an asset') : t('Add a debt')

  return (
    <Sheet open={!!kind} onClose={() => { reset(); onClose() }}>
      <div className="space-y-3">
        <h2 className="text-xl font-bold">{title}</h2>

        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Tap
              key={p.name}
              onClick={() => {
                setName(t(p.name))
                setIcon(p.icon || p.label)
                if (kind === 'accounts') setAccountKind(p.value)
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium ${
                name === t(p.name) ? 'bg-brand-500 text-white' : 'bg-slate-50'
              }`}
            >
              <span>{p.icon || p.label}</span>
              {t(p.name)}
            </Tap>
          ))}
        </div>

        <div>
          <label className="label">{t('Name')}</label>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === 'accounts' ? t('e.g. Santander') : kind === 'assets' ? t('e.g. S&P 500 fund') : t('e.g. Car loan')}
          />
        </div>

        {kind === 'assets' && (
          <div className="flex rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.06]">
            {[
              { v: false, l: t('By total') },
              { v: true, l: t('By units') },
            ].map((o) => (
              <Tap
                key={String(o.v)}
                onClick={() => setByUnits(o.v)}
                className={`flex-1 rounded-full py-2 text-sm font-semibold ${byUnits === o.v ? 'bg-white text-ink shadow-card' : 'text-muted'}`}
              >
                {o.l}
              </Tap>
            ))}
          </div>
        )}

        {kind === 'assets' && byUnits ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">{t('Quantity')}</label>
              <input className="field tnum" inputMode="decimal" value={qty} placeholder="0"
                onChange={(e) => setQty(e.target.value.replace(/[^0-9.,]/g, ''))} />
            </div>
            <div>
              <label className="label">{t('Cost per unit')}</label>
              <input className="field tnum" inputMode="decimal" value={unit} placeholder="0"
                onChange={(e) => setUnit(e.target.value.replace(/[^0-9.,]/g, ''))} />
            </div>
          </div>
        ) : (
          <div>
            <label className="label">{kind === 'debts' ? t('How much is left to pay?') : t('What it is worth today')}</label>
            <input className="field tnum text-2xl font-bold" inputMode="decimal" value={amount} placeholder="0"
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, '').replace('.', ','))} />
          </div>
        )}

        {byUnits && computed > 0 && (
          <p className="text-center text-sm font-medium text-brand-600">{money(computed)}</p>
        )}

        <Tap
          className="btn-primary w-full"
          disabled={!canSave}
          onClick={() => {
            onAdd({
              name: name.trim(),
              amount: String(computed),
              icon,
              kind: accountKind,
              note: byUnits && num(qty) > 0 ? t('{q} × {p}', { q: qty, p: money(num(unit)) }) : null,
            })
            reset()
          }}
        >
          {t('Add')}
        </Tap>
      </div>
    </Sheet>
  )
}

// The payoff. The number counts up, then a three-point line shows where this
// pace lands — plain arithmetic, and it says so, because a projection that
// quietly compounds at some assumed rate is a promise this app can't make.
function Reveal({ netWorth, monthlySaving }) {
  const y1 = netWorth + monthlySaving * 12
  const y3 = netWorth + monthlySaving * 36
  const pts = [netWorth, y1, y3]
  const max = Math.max(...pts, 1)
  const min = Math.min(...pts, 0)
  const W = 300
  const H = 110
  const x = (i) => (i / (pts.length - 1)) * W
  const y = (v) => H - ((v - min) / Math.max(max - min, 1)) * H
  const line = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const thisYear = new Date().getFullYear()

  return (
    <div className="space-y-4">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-brand-600">{t('Your net worth')}</p>
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="rounded-xl3 bg-mint-200 p-6 text-center"
      >
        <p className="figure text-brand-700">
          <Counter id="intro-networth" value={netWorth} format={(n) => money(n)} />
        </p>
        <p className="mt-1 text-sm text-brand-700/70">{t('And it updates itself from now on.')}</p>
      </motion.div>

      {monthlySaving > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card"
        >
          <p className="label mb-0">{t('Keeping this pace')}</p>
          <p className="tnum mt-1 text-2xl font-bold text-brand-700">{money(y3)}</p>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" preserveAspectRatio="none" role="img" aria-label={t('Projection')}>
            <defs>
              <linearGradient id="introFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--c-brand-500))" stopOpacity="0.25" />
                <stop offset="100%" stopColor="rgb(var(--c-brand-500))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <motion.path
              d={area}
              fill="url(#introFill)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            />
            <motion.path
              d={line}
              fill="none"
              stroke="rgb(var(--c-brand-500))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
            {pts.map((v, i) => (
              <motion.circle
                key={i}
                cx={x(i)}
                cy={y(v)}
                r="4"
                fill="rgb(var(--c-brand-500))"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.25, type: 'spring', stiffness: 400, damping: 18 }}
              />
            ))}
          </svg>
          <div className="mt-1 flex justify-between text-xs">
            {[t('Today'), String(thisYear + 1), String(thisYear + 3)].map((l, i) => (
              <span key={l} className={i === 2 ? 'font-semibold text-ink' : 'text-muted'}>{l}</span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {t('Saving {v} a month. Simple arithmetic — no investment growth assumed.', { v: money(monthlySaving) })}
          </p>
        </motion.div>
      )}
    </div>
  )
}
