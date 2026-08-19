import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccounts } from '../hooks/useAccounts'
import { useHoldings } from '../hooks/useHoldings'
import { useIntro } from '../hooks/useIntro'
import { money } from '../lib/format'
import { t } from '../lib/i18n'
import { Tap, Counter, motion, AnimatePresence } from '../components/motion'
import { useKeyboardInset } from '../hooks/useKeyboardInset'

const num = (s) => parseFloat((String(s) || '0').replace(',', '.')) || 0

// A guided set-up: one question per screen, each answer going somewhere real
// (accounts, holdings, your monthly income) rather than into a survey table
// nobody reads. Ends by showing the number it just helped you build, which is
// the only reward that matters here.
//
// Never opens itself — Home offers it and this is where "yes" goes. See
// useIntro for why.
export default function Intro() {
  const nav = useNavigate()
  const keyboardInset = useKeyboardInset()
  const { add: addAccount } = useAccounts()
  const { add: addHolding } = useHoldings()
  const { finish, snooze, row } = useIntro()

  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)

  // Answers are held here and written once at the end, so backing up and
  // changing your mind doesn't leave half-created accounts behind.
  const [cash, setCash] = useState('')
  const [assets, setAssets] = useState('')
  const [debts, setDebts] = useState('')
  const [income, setIncome] = useState(row?.monthly_income ? String(row.monthly_income) : '')
  const [spend, setSpend] = useState('')

  const netWorth = num(cash) + num(assets) - num(debts)
  const monthlySaving = Math.max(0, num(income) - num(spend))
  // Three years out, saving at this rate. Plain arithmetic, no growth rate
  // assumed — a projection that quietly compounds at 7% is a promise this
  // screen has no business making.
  const projection = netWorth + monthlySaving * 36

  const steps = useMemo(
    () => [
      { key: 'welcome' },
      { key: 'cash' },
      { key: 'assets' },
      { key: 'debts' },
      { key: 'income' },
      { key: 'spend' },
      { key: 'reveal' },
    ],
    []
  )
  const last = steps.length - 1
  const current = steps[step]

  const go = (d) => setStep((s) => Math.min(last, Math.max(0, s + d)))

  const complete = async () => {
    setBusy(true)
    // Only create things you actually told us about. A zero isn't an answer
    // worth persisting as an account.
    if (num(cash) > 0) {
      await addAccount({ name: t('Cash and accounts'), kind: 'bank', opening_balance: num(cash), is_default: true })
    }
    if (num(assets) > 0) {
      await addHolding({ kind: 'investment', name: t('Investments'), value: num(assets) })
    }
    if (num(debts) > 0) {
      await addHolding({ kind: 'debt', name: t('Debts'), value: num(debts) })
    }
    await finish({
      ...(num(income) > 0 ? { monthly_income: num(income) } : {}),
      ...(num(spend) > 0 ? { monthly_spend_estimate: num(spend) } : {}),
    })
    setBusy(false)
    nav('/')
  }

  const later = async () => {
    await snooze(7)
    nav('/')
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Progress and an exit that doesn't feel like giving up. */}
      <div className="safe-top sticky top-0 z-20 bg-surface px-4 pb-3">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Tap
            onClick={() => (step === 0 ? later() : go(-1))}
            aria-label={step === 0 ? t('Not now') : t('Back')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </Tap>
          <div className="flex flex-1 gap-1.5">
            {steps.map((s, i) => (
              <span
                key={s.key}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-brand-500' : 'bg-slate-200'}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md flex-1 px-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.key}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5 pt-6"
          >
            {current.key === 'welcome' && (
              <Step
                eyebrow={t('Getting to know you')}
                title={t('A few questions, then the app is yours')}
                blurb={t("Five short answers and every screen has real numbers in it. You can skip any of them, and change all of them later.")}
              >
                <div className="flex justify-center py-6 text-7xl">👋</div>
              </Step>
            )}

            {current.key === 'cash' && (
              <Step
                eyebrow={t('Your accounts')}
                title={t('How much do you have right now?')}
                blurb={t('What sits in your bank accounts and in cash. Investments and property come next.')}
              >
                <BigInput value={cash} onChange={setCash} autoFocus />
              </Step>
            )}

            {current.key === 'assets' && (
              <Step
                eyebrow={t('Your assets')}
                title={t('Any investments or property?')}
                blurb={t('Shares, funds, crypto, a flat — roughly what it is all worth today. Leave it empty if none.')}
              >
                <BigInput value={assets} onChange={setAssets} />
              </Step>
            )}

            {current.key === 'debts' && (
              <Step
                eyebrow={t('What you owe')}
                title={t('Mortgage or loans?')}
                blurb={t('This counts too, and you are going to have it in view. Leave it empty if none.')}
              >
                <BigInput value={debts} onChange={setDebts} />
              </Step>
            )}

            {current.key === 'income' && (
              <Step
                eyebrow={t('Your monthly rhythm')}
                title={t('How much comes in each month?')}
                blurb={t('Salary and anything else regular. This is what "saved this month" is measured against.')}
              >
                <BigInput value={income} onChange={setIncome} autoFocus />
              </Step>
            )}

            {current.key === 'spend' && (
              <Step
                eyebrow={t('Your monthly rhythm')}
                title={t('And roughly how much goes out?')}
                blurb={t('A rough number is fine — the app will learn the real one as you log things.')}
              >
                <BigInput value={spend} onChange={setSpend} autoFocus />
                {num(income) > 0 && num(spend) > 0 && (
                  <p className="text-center text-sm font-medium text-brand-600">
                    {t('That leaves about {v} a month.', { v: money(monthlySaving) })}
                  </p>
                )}
              </Step>
            )}

            {current.key === 'reveal' && (
              <Step eyebrow={t('Your net worth')} title="">
                <div className="rounded-xl3 bg-mint-200 p-6 text-center">
                  <p className="label mb-0 text-brand-700/70">{t('Net worth')}</p>
                  <p className="figure mt-1 text-brand-700">
                    <Counter id="intro-networth" value={netWorth} format={(n) => money(n)} />
                  </p>
                  <p className="mt-1 text-sm text-brand-700/70">{t('And it updates itself from now on.')}</p>
                </div>
                {monthlySaving > 0 && (
                  <div className="card text-center">
                    <p className="label mb-0">{t('Keeping this pace')}</p>
                    <p className="tnum mt-1 text-2xl font-bold">{money(projection)}</p>
                    <p className="mt-1 text-xs text-muted">
                      {t('In three years, saving {v} a month. Simple arithmetic — no investment growth assumed.', { v: money(monthlySaving) })}
                    </p>
                  </div>
                )}
              </Step>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className="sticky bottom-0 bg-gradient-to-t from-surface via-surface to-transparent px-4 pb-2 pt-6 safe-bottom"
        style={keyboardInset ? { transform: `translateY(-${keyboardInset}px)` } : undefined}
      >
        <div className="mx-auto max-w-md space-y-2">
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
        </div>
      </div>
    </div>
  )
}

function Step({ eyebrow, title, blurb, children }) {
  return (
    <>
      {eyebrow && <p className="text-center text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
      {title && <h1 className="text-center text-2xl font-bold leading-tight tracking-tight">{title}</h1>}
      {blurb && <p className="text-center text-sm text-muted">{blurb}</p>}
      {children}
    </>
  )
}

// The same oversized figure the Add screen uses, so a number you type here
// feels like the same kind of thing as a number you type there.
function BigInput({ value, onChange, autoFocus = false }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <span className="shrink-0 text-2xl text-muted">€</span>
      <input
        className="tnum w-full bg-transparent text-center text-5xl font-bold tracking-tight outline-none placeholder:text-slate-300"
        inputMode="decimal"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, '').replace('.', ','))}
        placeholder="0"
        aria-label={t('Amount')}
      />
    </div>
  )
}
