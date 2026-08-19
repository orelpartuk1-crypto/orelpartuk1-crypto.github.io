import { useState } from 'react'
import TopBar from '../components/TopBar'
import { Sheet } from '../components/motion'
import { money } from '../lib/format'
import { t } from '../lib/i18n'
import { loanSummary, futureValue, fireNumber, yearsToTarget, realValue, refinance } from '../lib/finance'

const num = (s) => parseFloat((String(s) || '0').replace(',', '.')) || 0

const SIMS = [
  { key: 'loan', emoji: '💶', title: t('Loan'), sub: t('Payment and total interest') },
  { key: 'car', emoji: '🚗', title: t('Car'), sub: t('Can you afford it?') },
  { key: 'house', emoji: '🏠', title: t('House'), sub: t('Mortgage and deposit') },
  { key: 'fire', emoji: '⏳', title: t('Retirement'), sub: t('Your FIRE number') },
  { key: 'invest', emoji: '📈', title: t('Invest monthly'), sub: t('Compound interest') },
  { key: 'refi', emoji: '🔁', title: t('Refinancing'), sub: t('Is it worth switching?') },
  { key: 'inflation', emoji: '🔥', title: t('Inflation'), sub: t('Your money in X years') },
]

// `onClose`: present when opened as a sheet from Wealth rather than as its
// own route.
export default function Simulators({ onClose }) {
  const [open, setOpen] = useState(null)

  return (
    <div className={onClose ? '' : 'pb-28'}>
      <TopBar title={t('Simulators')} subtitle={t('Explore before deciding')} back onBack={onClose} />
      <div className="mx-auto max-w-md px-4 space-y-3">
        <div className="card divide-y divide-slate-100">
          {SIMS.map((s) => (
            <button
              key={s.key}
              onClick={() => setOpen(s.key)}
              className="flex w-full items-center gap-3 py-3 text-left active:opacity-60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">{s.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{s.title}</span>
                <span className="block text-sm text-muted">{s.sub}</span>
              </span>
              <span className="shrink-0 text-muted">›</span>
            </button>
          ))}
        </div>

        <p className="px-1 text-xs text-muted">
          {t("These are plain calculators — they don't read or change anything you've logged, and none of it is financial advice.")}
        </p>
      </div>

      <SimSheet which={open} onClose={() => setOpen(null)} />
    </div>
  )
}

// This used to hand-roll its own sheet with animate-fade-in/animate-sheet-up
// — the second was never actually defined in the Tailwind config, so it
// snapped open with zero transition. The shared Sheet component gets the
// real slide-up everything else in the app has.
function SimSheet({ which, onClose }) {
  const sim = SIMS.find((s) => s.key === which)
  return (
    <Sheet open={!!which} onClose={onClose}>
      {sim && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{sim.emoji} {sim.title}</h2>
          {which === 'loan' && <LoanSim />}
          {which === 'car' && <CarSim />}
          {which === 'house' && <HouseSim />}
          {which === 'fire' && <FireSim />}
          {which === 'invest' && <InvestSim />}
          {which === 'refi' && <RefiSim />}
          {which === 'inflation' && <InflationSim />}
          <button className="btn-ghost w-full" onClick={onClose}>{t('Close')}</button>
        </div>
      )}
    </Sheet>
  )
}

function Field({ label, value, onChange, suffix, step }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-4 py-3.5 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-50 dark:border-white/10">
        <input
          className="tnum min-w-0 flex-1 bg-transparent text-lg outline-none"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ''))}
          placeholder={step || '0'}
        />
        {suffix && <span className="shrink-0 text-muted">{suffix}</span>}
      </div>
    </div>
  )
}

function Result({ rows, headline }) {
  return (
    <div className="rounded-xl3 bg-mint-200 p-4">
      {headline && (
        <>
          <p className="label mb-0 text-center text-brand-700/70">{headline.label}</p>
          <p className="tnum mt-1 text-center text-4xl font-bold text-brand-700">{headline.value}</p>
        </>
      )}
      {rows?.length > 0 && (
        <div className={`space-y-1 ${headline ? 'mt-4 border-t border-brand-500/15 pt-3' : ''}`}>
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between text-sm">
              <span className="text-brand-700/80">{r.label}</span>
              <span className="tnum font-semibold text-brand-700">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LoanSim() {
  const [amount, setAmount] = useState('10000')
  const [rate, setRate] = useState('6')
  const [years, setYears] = useState('5')
  const s = loanSummary(num(amount), num(rate), num(years))
  return (
    <>
      <Field label={t('Amount borrowed')} value={amount} onChange={setAmount} suffix="€" />
      <Field label={t('Interest rate')} value={rate} onChange={setRate} suffix={t('% a year')} />
      <Field label={t('Over')} value={years} onChange={setYears} suffix={t('years')} />
      <Result
        headline={{ label: t('Every month'), value: money(s.payment) }}
        rows={[
          { label: t('Payments'), value: `${s.months}` },
          { label: t('Total repaid'), value: money(s.totalPaid) },
          { label: t('Of which interest'), value: money(s.totalInterest) },
        ]}
      />
    </>
  )
}

function CarSim() {
  const [price, setPrice] = useState('18000')
  const [deposit, setDeposit] = useState('3000')
  const [rate, setRate] = useState('7')
  const [years, setYears] = useState('5')
  const [running, setRunning] = useState('150')
  const [income, setIncome] = useState('2000')

  const borrowed = Math.max(0, num(price) - num(deposit))
  const s = loanSummary(borrowed, num(rate), num(years))
  const perMonth = s.payment + num(running)
  const share = num(income) > 0 ? (perMonth / num(income)) * 100 : 0

  return (
    <>
      <Field label={t('Price')} value={price} onChange={setPrice} suffix="€" />
      <Field label={t('Deposit')} value={deposit} onChange={setDeposit} suffix="€" />
      <Field label={t('Interest rate')} value={rate} onChange={setRate} suffix={t('% a year')} />
      <Field label={t('Over')} value={years} onChange={setYears} suffix={t('years')} />
      <Field label={t('Running costs')} value={running} onChange={setRunning} suffix={t('€/month')} />
      <Field label={t('Your monthly income')} value={income} onChange={setIncome} suffix="€" />
      <Result
        headline={{ label: t('All in, every month'), value: money(perMonth) }}
        rows={[
          { label: t('Finance'), value: money(s.payment) },
          { label: t('Running costs'), value: money(num(running)) },
          { label: t('Share of income'), value: `${share.toFixed(0)}%` },
          { label: t('Total interest'), value: money(s.totalInterest) },
        ]}
      />
      {share > 0 && (
        <p className={`rounded-2xl p-3 text-sm ${share > 20 ? 'bg-amber-50 text-amber-800' : 'bg-brand-50 text-brand-700'}`}>
          {share > 20
            ? t("That's {pct}% of your income going on one car. Comfortable is usually under 15–20%.", { pct: share.toFixed(0) })
            : t('{pct}% of your income — within the range most people find comfortable.', { pct: share.toFixed(0) })}
        </p>
      )}
    </>
  )
}

function HouseSim() {
  const [price, setPrice] = useState('300000')
  const [depositPct, setDepositPct] = useState('20')
  const [rate, setRate] = useState('3')
  const [years, setYears] = useState('30')

  const deposit = (num(price) * num(depositPct)) / 100
  // Spain: ITP, notary and registry land somewhere around 10-12% on top.
  const fees = num(price) * 0.11
  const borrowed = Math.max(0, num(price) - deposit)
  const s = loanSummary(borrowed, num(rate), num(years))

  return (
    <>
      <Field label={t('Price')} value={price} onChange={setPrice} suffix="€" />
      <Field label={t('Deposit')} value={depositPct} onChange={setDepositPct} suffix="%" />
      <Field label={t('Interest rate')} value={rate} onChange={setRate} suffix={t('% a year')} />
      <Field label={t('Over')} value={years} onChange={setYears} suffix={t('years')} />
      <Result
        headline={{ label: t('Mortgage each month'), value: money(s.payment) }}
        rows={[
          { label: t('Deposit'), value: money(deposit) },
          { label: t('Taxes & fees (~11%)'), value: money(fees) },
          { label: t('Cash needed upfront'), value: money(deposit + fees) },
          { label: t('Borrowed'), value: money(borrowed) },
          { label: t('Total interest'), value: money(s.totalInterest) },
        ]}
      />
      <p className="rounded-2xl bg-slate-50 p-3 text-xs text-muted">
        {t('Fees are a rough 11% for Spain — transfer tax, notary and registry vary by region and by whether the place is new or resale. Ask your gestor for the real figure.')}
      </p>
    </>
  )
}

function FireSim() {
  const [spend, setSpend] = useState('2000')
  const [rate, setRate] = useState('4')
  const [saving, setSaving] = useState('800')
  const [pot, setPot] = useState('10000')
  const [growth, setGrowth] = useState('6')

  const target = fireNumber(num(spend) * 12, num(rate))
  const years = yearsToTarget(target, num(saving), num(growth), num(pot))

  return (
    <>
      <Field label={t("What you'd spend a month")} value={spend} onChange={setSpend} suffix="€" />
      <Field label={t('Safe withdrawal rate')} value={rate} onChange={setRate} suffix="%" />
      <Field label={t('Saving each month')} value={saving} onChange={setSaving} suffix="€" />
      <Field label={t('Already invested')} value={pot} onChange={setPot} suffix="€" />
      <Field label={t('Expected return')} value={growth} onChange={setGrowth} suffix={t('% a year')} />
      <Result
        headline={{ label: t('You would need'), value: money(target) }}
        rows={[
          { label: t('At this pace'), value: years == null ? t('Never at this rate') : t('{n} years', { n: years.toFixed(1) }) },
          { label: t('Yearly spending'), value: money(num(spend) * 12) },
        ]}
      />
    </>
  )
}

function InvestSim() {
  const [monthly, setMonthly] = useState('300')
  const [rate, setRate] = useState('6')
  const [years, setYears] = useState('20')
  const [initial, setInitial] = useState('0')

  const end = futureValue(num(monthly), num(rate), num(years), num(initial))
  const paidIn = num(initial) + num(monthly) * Math.round(num(years) * 12)

  return (
    <>
      <Field label={t('Investing each month')} value={monthly} onChange={setMonthly} suffix="€" />
      <Field label={t('Starting with')} value={initial} onChange={setInitial} suffix="€" />
      <Field label={t('Expected return')} value={rate} onChange={setRate} suffix={t('% a year')} />
      <Field label={t('For')} value={years} onChange={setYears} suffix={t('years')} />
      <Result
        headline={{ label: t('After {n} years', { n: num(years) || 0 }), value: money(end) }}
        rows={[
          { label: t('You put in'), value: money(paidIn) },
          { label: t('Growth'), value: money(Math.max(0, end - paidIn)) },
        ]}
      />
      <p className="rounded-2xl bg-slate-50 p-3 text-xs text-muted">
        {t("A steady return is an assumption, not a promise — real markets don't move in a straight line.")}
      </p>
    </>
  )
}

function RefiSim() {
  const [balance, setBalance] = useState('150000')
  const [current, setCurrent] = useState('4')
  const [next, setNext] = useState('2.5')
  const [years, setYears] = useState('20')
  const [cost, setCost] = useState('2000')

  const r = refinance({
    balance: num(balance),
    currentRatePct: num(current),
    newRatePct: num(next),
    yearsLeft: num(years),
    switchingCost: num(cost),
  })

  return (
    <>
      <Field label={t('Outstanding balance')} value={balance} onChange={setBalance} suffix="€" />
      <Field label={t('Current rate')} value={current} onChange={setCurrent} suffix="%" />
      <Field label={t('New rate')} value={next} onChange={setNext} suffix="%" />
      <Field label={t('Years left')} value={years} onChange={setYears} suffix={t('years')} />
      <Field label={t('Cost to switch')} value={cost} onChange={setCost} suffix="€" />
      <Result
        headline={{
          label: r.monthlySaving > 0 ? t('Saved every month') : t('Extra every month'),
          value: money(Math.abs(r.monthlySaving)),
        }}
        rows={[
          { label: t('Now'), value: money(r.now) },
          { label: t('After switching'), value: money(r.next) },
          {
            label: t('Pays for itself in'),
            value: r.breakEvenMonths == null ? t('Never — it costs more') : t('{n} months', { n: r.breakEvenMonths }),
          },
          { label: t('Over the full term'), value: money(r.lifetimeSaving) },
        ]}
      />
    </>
  )
}

function InflationSim() {
  const [amount, setAmount] = useState('10000')
  const [rate, setRate] = useState('3')
  const [years, setYears] = useState('10')

  const worth = realValue(num(amount), num(rate), num(years))
  const lost = num(amount) - worth

  return (
    <>
      <Field label={t('Amount today')} value={amount} onChange={setAmount} suffix="€" />
      <Field label={t('Inflation')} value={rate} onChange={setRate} suffix={t('% a year')} />
      {/* Context-prefixed: the bare "In" is already a dictionary key for the
          Movements direction filter ("incoming" -> Entradas), and this one
          means "in N years' time". Same English word, unrelated meanings. */}
      <Field label={t('duration|In')} value={years} onChange={setYears} suffix={t('years')} />
      <Result
        headline={{ label: t('Buys what {v} buys today', { v: money(worth) }), value: money(worth) }}
        rows={[
          { label: t('Purchasing power lost'), value: money(lost) },
          { label: t('That is'), value: `${num(amount) > 0 ? ((lost / num(amount)) * 100).toFixed(0) : 0}%` },
        ]}
      />
    </>
  )
}
