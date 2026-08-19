import { Children, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { enablePush, pushSupported } from '../lib/push'
import { useAccounts } from '../hooks/useAccounts'
import { useHoldings } from '../hooks/useHoldings'
import { useRecurring } from '../hooks/useRecurring'
import { useIntro } from '../hooks/useIntro'
import { money } from '../lib/format'
import { t } from '../lib/i18n'
import { Tap, Counter, Sheet, motion, AnimatePresence, useEntrance } from '../components/motion'
import { useAssetLookup } from '../hooks/useAssetLookup'
import { useAnimationControls, useReducedMotion } from 'motion/react'

const num = (s) => parseFloat((String(s) || '0').replace(',', '.')) || 0

// One shared entrance for everything on a step: the parts arrive in the order
// you read them instead of the whole screen appearing at once. Spring rather
// than a fixed duration, so it matches the rest of the app's feel and settles
// naturally instead of stopping dead.
const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } } }

const RISE = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 34 } },
}
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
  const { active: existingAccounts, balances, add: addAccount, remove: removeAccount } = useAccounts()
  const { active: existingHoldings, add: addHolding, remove: removeHolding } = useHoldings()
  const { items: existingRecurring, add: addRecurring, update: updateRecurring, toggle: toggleRecurring } = useRecurring()
  const { finish, snooze, row } = useIntro()

  // The one recurring item that represents "my salary", if it already exists.
  // Re-running this flow must update it, never add a second one next to it —
  // that's exactly how a real paycheck ended up counted twice.
  const existingSalary = existingRecurring.find((r) => r.kind === 'income' && r.active)

  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)
  // The header total gives a little kick whenever it changes, so adding an
  // account registers as something happening rather than a digit quietly
  // differing. Driven by controls rather than a `key`, because remounting
  // would restart the count-up animation instead of continuing it.
  const totalPulse = useAnimationControls()
  const reduced = useReducedMotion()

  // Everything is held here and written once at the end, so backing up and
  // changing your mind never leaves half-created accounts behind.
  //
  // Seeded from what already exists (once each hook's first real load
  // arrives — hence the `seeded` guard, so a slightly-later Supabase response
  // doesn't stomp on something you already typed). Re-opening this flow is
  // then an edit of your real setup, not a second, competing copy of it: what
  // you see IS your accounts, so removing one here and saving actually
  // removes it, and nothing already on file gets re-created next to itself.
  // Every seeded row carries `dbId` so complete() can tell "already saved,
  // maybe just remove it" apart from "brand new, needs inserting".
  const [seeded, setSeeded] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [assets, setAssets] = useState([])
  const [debts, setDebts] = useState([])
  const [income, setIncome] = useState(
    existingSalary ? String(existingSalary.amount) : row?.monthly_income ? String(row.monthly_income) : ''
  )
  const [spend, setSpend] = useState('')
  const [saveSalary, setSaveSalary] = useState(true)
  const [payday, setPayday] = useState(existingSalary?.day_of_month || 1)
  const [adding, setAdding] = useState(null) // 'accounts' | 'assets' | 'debts'

  if (!seeded && (existingAccounts.length || existingHoldings.length)) {
    setSeeded(true)
    setAccounts(
      existingAccounts.map((a) => ({
        id: a.id, dbId: a.id, name: a.name, amount: String(balances[a.id] ?? a.opening_balance ?? 0),
      }))
    )
    setAssets(
      existingHoldings
        .filter((h) => h.kind !== 'debt')
        .map((h) => ({ id: h.id, dbId: h.id, name: h.name, amount: String(h.value), note: h.live ? t('{ticker} · live', { ticker: h.asset_type === 'fund' ? h.isin : h.ticker }) : null }))
    )
    setDebts(
      existingHoldings
        .filter((h) => h.kind === 'debt')
        .map((h) => ({ id: h.id, dbId: h.id, name: h.name, amount: String(h.value) }))
    )
  }

  const sum = (rows) => rows.reduce((a, r) => a + num(r.amount), 0)
  const netWorth = sum(accounts) + sum(assets) - sum(debts)
  const pulse = () => {
    if (reduced) return
    totalPulse.start({ scale: [1, 1.09, 1], transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } })
  }
  const monthlySaving = Math.max(0, num(income) - num(spend))

  const steps = useMemo(() => {
    const base = ['welcome', 'accounts', 'assets', 'debts', 'rhythm']
    if (num(income) > 0 && saveSalary) base.push('payday')
    // Asked here rather than sprung on you at launch, and only where it can
    // actually work — on iOS that means the installed PWA, so offering it in a
    // normal Safari tab would be promising something that cannot happen.
    if (pushSupported()) base.push('alerts')
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

    // Anything seeded from real data that isn't in the list any more was
    // removed on purpose — the trash icon on that row is what did it. Acting
    // on that here, once, is what makes "remove it" during this flow actually
    // remove it, instead of the next save quietly re-adding it because it was
    // never told to let go.
    const stillHere = (rows) => new Set(rows.filter((r) => r.dbId).map((r) => r.dbId))
    for (const a of existingAccounts) if (!stillHere(accounts).has(a.id)) await removeAccount(a.id)
    for (const h of existingHoldings) if (!stillHere([...assets, ...debts]).has(h.id)) await removeHolding(h.id)

    // Only rows without a dbId are new — anything seeded from what already
    // existed is left alone rather than re-created next to itself. The first
    // genuinely new account becomes the default only if there wasn't one
    // already; otherwise the household already has a default and adding a
    // second one is exactly the "two accounts both marked default" bug this
    // is here to avoid.
    const hadDefault = existingAccounts.some((a) => a.is_default)
    let defaultAssigned = hadDefault
    for (const a of accounts) {
      if (a.dbId) continue
      if (num(a.amount) === 0 && !a.name) continue
      await addAccount({
        name: a.name || t('Cash and accounts'),
        kind: a.kind || 'bank',
        opening_balance: num(a.amount),
        is_default: !defaultAssigned,
      })
      defaultAssigned = true
    }
    for (const a of assets) {
      if (a.dbId) continue
      await addHolding({
        kind: 'investment',
        name: a.name || t('Investments'),
        value: num(a.amount),
        asset_type: a.assetType || 'stock',
        cost_basis: a.costBasis ? num(a.costBasis) : null,
        ...(a.ticker
          ? { ticker: a.ticker, units: a.units, unit_price: a.unitPrice, price_currency: a.priceCurrency, priced_at: new Date().toISOString() }
          : {}),
        ...(a.isin
          ? { isin: a.isin, yahoo_symbol: a.yahooSymbol, units: a.units, unit_price: a.unitPrice, price_currency: a.priceCurrency, priced_at: new Date().toISOString() }
          : {}),
      })
    }
    for (const d of debts) {
      if (d.dbId) continue
      await addHolding({ kind: 'debt', name: d.name || t('Debts'), value: num(d.amount) })
    }

    // A salary you told us about is a real recurring item, not just a number
    // on your profile — that's what makes it appear under "Coming up", on the
    // day you actually said. If one already exists, this updates it in place;
    // creating a second one next to it is the exact bug that made a real
    // paycheck get counted twice.
    if (num(income) > 0 && saveSalary) {
      if (existingSalary) {
        await updateRecurring(existingSalary.id, { amount: num(income), day_of_month: payday })
      } else {
        await addRecurring(
          { kind: 'income', name: t('Salary'), amount: num(income), source: t('Salary'), day_of_month: payday },
          { materialize: false }
        )
      }
    } else if (existingSalary && !saveSalary) {
      // Turned off on a re-run — stop it recurring rather than deleting its
      // history, same soft-close the Plan/Recurring page itself uses.
      await toggleRecurring(existingSalary.id, false)
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
                  className="h-1.5 flex-1 origin-left rounded-full"
                  animate={{
                    backgroundColor: i <= step ? 'rgb(var(--c-brand-500))' : 'rgb(var(--c-n-200))',
                    // The one you're on sits slightly taller, so the bar shows
                    // where you are and not only how far you've come.
                    scaleY: i === step ? 1.9 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
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
                <motion.p animate={totalPulse} className="tnum text-xl font-bold">
                  <Counter id="intro-running" value={netWorth} format={(n) => money(n)} duration={450} />
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            initial={{ opacity: 0, x: dir * 36, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: dir * -36, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 460, damping: 38, mass: 0.8 }}
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
                  onRemove={(id) => { setAccounts((r) => r.filter((x) => x.id !== id)); pulse() }}
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
                  onRemove={(id) => { setAssets((r) => r.filter((x) => x.id !== id)); pulse() }}
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
                  onRemove={(id) => { setDebts((r) => r.filter((x) => x.id !== id)); pulse() }}
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

            {key === 'alerts' && <AlertsStep onDone={() => go(1)} />}

            {key === 'reveal' && (
              <Reveal netWorth={netWorth} monthlySaving={monthlySaving} />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 space-y-2">
          {key === 'alerts' ? null : step === last ? (
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
        onAdd={(item) => { setListFor?.((r) => [...r, { id: uid(), ...item }]); setAdding(null); pulse() }}
        existing={listFor}
      />
    </div>
  )
}

// The mascot's line, then the section, then the question — the order the
// reference uses, and it reads as being walked through rather than surveyed.
function Step({ guide, eyebrow, title, blurb, children }) {
  const initial = useEntrance() ? 'hidden' : false
  return (
    <motion.div variants={STAGGER} initial={initial} animate="show" className="space-y-4">
      {guide && (
        <motion.div variants={RISE} className="flex items-start gap-2.5">
          {/* Same guard as the rest: on a paused page this must still be a
              robot, not an empty gap. */}
          <motion.span
            className="shrink-0 text-2xl"
            initial={initial === false ? false : { scale: 0.4, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 16, delay: 0.1 }}
          >
            🤖
          </motion.span>
          <p className="pt-1 text-sm text-muted">{guide}</p>
        </motion.div>
      )}
      {eyebrow && (
        <motion.p variants={RISE} className="text-center text-xs font-semibold uppercase tracking-wider text-brand-600">
          {eyebrow}
        </motion.p>
      )}
      {title && <motion.h1 variants={RISE} className="text-center text-2xl font-bold leading-tight tracking-tight">{title}</motion.h1>}
      {blurb && <motion.p variants={RISE} className="text-center text-sm text-muted">{blurb}</motion.p>}
      {/* Each child gets its own place in the queue, so a list and the button
          under it don't land together in one lump. */}
      {Children.map(children, (child) => (child ? <motion.div variants={RISE}>{child}</motion.div> : child))}
    </motion.div>
  )
}

// Turning on alerts, asked as a step rather than an iOS prompt out of nowhere.
//
// Every line below is something the app genuinely sends — coming payments and
// budget warnings come off the same alert builder Home uses. Listing a feature
// here that does not exist would be the fastest way to make the permission
// feel like a trick.
//
// The first two rows are real pushes as of 2026-08-19 (see
// supabase/functions/send-reminders) — a daily nudge, and a bill or salary
// landing within a day or two. The last two are honestly marked as not built
// yet: they already exist as in-app cards on Home, but nothing pushes them to
// your phone. Listing something here that doesn't happen would make this
// screen a trick, which is the one thing it can't be.
function AlertsStep({ onDone }) {
  const { user, updateReminderHour, reminderHour } = useAuth()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const initial = useEntrance() ? 'hidden' : false

  const PERKS = [
    { icon: '🔔', title: t('A daily nudge'), sub: t('If you haven’t logged anything by evening') },
    { icon: '⏳', title: t('Bills before they land'), sub: t('A day or two before a subscription or your salary') },
    { icon: '🎯', title: t('Budget nearly gone'), sub: t('Coming soon — for now it’s a card here in the app'), soon: true },
    { icon: '📊', title: t('A weekly summary'), sub: t('Coming soon — for now it’s a card here in the app'), soon: true },
  ]

  const turnOn = async () => {
    setBusy(true); setErr(null)
    try {
      await enablePush(user.id)
      await updateReminderHour(reminderHour ?? 21)
      onDone()
    } catch (e) {
      // A refused permission is a decision, not a failure — say what happened
      // and let the flow carry on rather than trapping anyone on this screen.
      setErr(e?.message || t('Could not turn on notifications.'))
      setBusy(false)
    }
  }

  return (
    <motion.div variants={STAGGER} initial={initial} animate="show" className="space-y-4">
      <motion.div variants={RISE} className="pt-2 text-center">
        <motion.span
          className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-4xl"
          initial={initial === false ? false : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 15, delay: 0.05 }}
        >
          {/* A bell that actually rings on arrival. */}
          <motion.span
            animate={{ rotate: [0, -14, 11, -8, 5, 0] }}
            transition={{ delay: 0.5, duration: 0.9, ease: 'easeInOut' }}
          >
            🔔
          </motion.span>
        </motion.span>
      </motion.div>
      <motion.p variants={RISE} className="text-center text-xs font-semibold uppercase tracking-wider text-brand-600">
        {t('Notifications')}
      </motion.p>
      <motion.h1 variants={RISE} className="text-center text-2xl font-bold leading-tight tracking-tight">
        {t('I’ll tell you what matters')}
      </motion.h1>

      <div className="space-y-2">
        {PERKS.map((p) => (
          <motion.div
            key={p.title}
            variants={RISE}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-card ${p.soon ? 'bg-white/60' : 'bg-white'}`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${p.soon ? 'bg-slate-100 grayscale' : 'bg-brand-50'}`}>
              {p.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block font-semibold leading-tight ${p.soon ? 'text-muted' : ''}`}>{p.title}</span>
              <span className="block text-xs text-muted">{p.sub}</span>
            </span>
          </motion.div>
        ))}
      </div>

      {err && <motion.p variants={RISE} className="text-center text-sm text-spend">{err}</motion.p>}

      <motion.div variants={RISE} className="space-y-2 pt-1">
        <Tap className="btn-primary w-full" disabled={busy} onClick={turnOn}>
          {busy ? t('Just a moment…') : t('Turn on alerts')}
        </Tap>
        <Tap className="w-full py-2 text-center text-sm font-semibold text-muted" onClick={onDone}>
          {t('Not now')}
        </Tap>
      </motion.div>
    </motion.div>
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
  // An asset either tracks the real market (ticker/ISIN + units) or is worth
  // whatever you say it's worth (a flat, a private stake, cash) — the same
  // split Wealth's own "add an asset" sheet uses, so typing "SP500" and a
  // total here no longer produces something that looks like a real holding
  // but is actually frozen text, the way it used to.
  const [assetType, setAssetType] = useState('stock') // 'stock' | 'fund'
  const [identifier, setIdentifier] = useState('') // ticker or ISIN, by assetType
  const [units, setUnits] = useState('')
  const [costBasis, setCostBasis] = useState('')

  const presets = kind === 'accounts' ? ACCOUNT_KINDS : kind === 'assets' ? ASSET_KINDS : DEBT_KINDS
  const isFund = assetType === 'fund'
  const id = identifier.trim().toUpperCase()
  // Look the identifier up while you type it, so a typo — or the wrong ISIN
  // for a fund — shows itself here rather than as a holding that quietly
  // never moves with the market.
  const { livePrice, lookingUp } = useAssetLookup(kind === 'assets' ? assetType : null, kind === 'assets' ? identifier : null, null)
  const tracked = kind === 'assets' && !!id && !!livePrice && num(units) > 0
  const computed = tracked ? num(units) * livePrice.price : num(amount)
  const canSave = !!name.trim() && computed > 0

  const reset = () => {
    setName(''); setAmount(''); setIcon(null); setAssetType('stock'); setIdentifier('')
    setUnits(''); setCostBasis(''); setAccountKind('bank')
  }

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

        {kind === 'assets' && (
          <div className="flex rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.06]">
            {[{ v: 'stock', l: t('Stock / ETF') }, { v: 'fund', l: t('Mutual fund') }].map((o) => (
              <Tap
                key={o.v}
                onClick={() => { setAssetType(o.v); setIdentifier('') }}
                className={`flex-1 rounded-full py-2 text-sm font-semibold ${assetType === o.v ? 'bg-white text-ink shadow-card' : 'text-muted'}`}
              >
                {o.l}
              </Tap>
            ))}
          </div>
        )}

        <div>
          <label className="label">{t('Name')}</label>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === 'accounts' ? t('e.g. Santander') : kind === 'assets' ? (isFund ? t('e.g. Vanguard Global Stock Index') : t('e.g. S&P 500 fund')) : t('e.g. Car loan')}
          />
        </div>

        {kind === 'assets' && (
          <>
            <div>
              <label className="label">{isFund ? t('ISIN') : t('Ticker (optional)')}</label>
              <input className="field" value={identifier} onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                placeholder={isFund ? t('e.g. IE0032620787') : t('e.g. VUAA.L')} />
              <p className="mt-1 px-1 text-xs text-muted">
                {isFund
                  ? t('The 12-character code on your fund statement — it uniquely identifies the exact fund and share class.')
                  : t('Use the exchange suffix — VUAA.L (London), VWCE.DE (Xetra), SAN.MC (Madrid). No suffix means a US listing.')}
              </p>
            </div>
            <div>
              <label className="label">{t('How many units')}</label>
              <input className="field" inputMode="decimal" value={units}
                onChange={(e) => setUnits(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder={isFund ? t('e.g. 12.34567') : t('e.g. 12')} />
              {isFund && (
                <p className="mt-1 px-1 text-xs text-muted">
                  {t('Funds are usually bought by amount, not whole units — decimals are fine and expected here.')}
                </p>
              )}
            </div>
          </>
        )}

        {!tracked && (
          <div>
            <label className="label">{kind === 'debts' ? t('How much is left to pay?') : t('What it is worth today')}</label>
            <input className="field tnum text-2xl font-bold" inputMode="decimal" value={amount} placeholder="0"
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, '').replace('.', ','))} />
          </div>
        )}

        {kind === 'assets' && lookingUp && <p className="px-1 text-sm text-muted">{t('Looking up {id}…', { id })}</p>}
        {kind === 'assets' && !lookingUp && id && !livePrice && (
          <p className="px-1 text-sm text-muted">
            {isFund
              ? t('No live price for that ISIN — it will use the value you type. Double-check the code.')
              : t('No live price for that ticker — it will use the value you type. Check the exchange suffix.')}
          </p>
        )}
        {kind === 'assets' && livePrice && (
          <div className="rounded-2xl bg-brand-50 px-4 py-3">
            <p className="text-sm text-muted">
              {t('{ticker} · {price} per unit', { ticker: id, price: money(livePrice.price) })}
              {livePrice.rawCurrency !== livePrice.currency && t(' (converted from {cur})', { cur: livePrice.rawCurrency })}
            </p>
            {num(units) > 0 && <p className="text-xl font-bold">{money(computed)}</p>}
          </div>
        )}

        {kind === 'assets' && (
          <div>
            <label className="label">{t('Total invested (optional)')}</label>
            <input className="field" inputMode="decimal" value={costBasis}
              onChange={(e) => setCostBasis(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0" />
            <p className="mt-1 px-1 text-xs text-muted">
              {t('What you actually paid in, total — this is what profit/loss gets measured against.')}
            </p>
          </div>
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
              assetType,
              costBasis: num(costBasis) > 0 ? num(costBasis) : null,
              ...(tracked && !isFund
                ? { ticker: id, units: num(units), unitPrice: livePrice.price, priceCurrency: livePrice.currency, note: t('{ticker} · live', { ticker: id }) }
                : {}),
              ...(tracked && isFund
                ? { isin: id, yahooSymbol: livePrice.symbol, units: num(units), unitPrice: livePrice.price, priceCurrency: livePrice.currency, note: t('{ticker} · live', { ticker: id }) }
                : {}),
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
