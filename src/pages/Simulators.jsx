import { useState } from 'react'
import TopBar from '../components/TopBar'
import { money } from '../lib/format'
import { loanSummary, futureValue, fireNumber, yearsToTarget, realValue, refinance } from '../lib/finance'

const num = (s) => parseFloat((String(s) || '0').replace(',', '.')) || 0

const SIMS = [
  { key: 'loan', emoji: '💶', title: 'Loan', sub: 'Payment and total interest' },
  { key: 'car', emoji: '🚗', title: 'Car', sub: 'Can you afford it?' },
  { key: 'house', emoji: '🏠', title: 'House', sub: 'Mortgage and deposit' },
  { key: 'fire', emoji: '⏳', title: 'Retirement', sub: 'Your FIRE number' },
  { key: 'invest', emoji: '📈', title: 'Invest monthly', sub: 'Compound interest' },
  { key: 'refi', emoji: '🔁', title: 'Refinancing', sub: 'Is it worth switching?' },
  { key: 'inflation', emoji: '🔥', title: 'Inflation', sub: 'Your money in X years' },
]

export default function Simulators() {
  const [open, setOpen] = useState(null)

  return (
    <div className="pb-28">
      <TopBar title="Simulators" subtitle="Explore before deciding" back />
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
          These are plain calculators — they don't read or change anything you've logged, and none of
          it is financial advice.
        </p>
      </div>

      {open && <Sheet which={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Sheet({ which, onClose }) {
  const sim = SIMS.find((s) => s.key === which)
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 animate-fade-in" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-4 pb-10 animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
        <div className="mx-auto max-w-md space-y-4">
          <h2 className="text-xl font-bold">{sim.emoji} {sim.title}</h2>
          {which === 'loan' && <LoanSim />}
          {which === 'car' && <CarSim />}
          {which === 'house' && <HouseSim />}
          {which === 'fire' && <FireSim />}
          {which === 'invest' && <InvestSim />}
          {which === 'refi' && <RefiSim />}
          {which === 'inflation' && <InflationSim />}
          <button className="btn-ghost w-full" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, suffix, step }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-4 py-3">
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
      <Field label="Amount borrowed" value={amount} onChange={setAmount} suffix="€" />
      <Field label="Interest rate" value={rate} onChange={setRate} suffix="% a year" />
      <Field label="Over" value={years} onChange={setYears} suffix="years" />
      <Result
        headline={{ label: 'Every month', value: money(s.payment) }}
        rows={[
          { label: 'Payments', value: `${s.months}` },
          { label: 'Total repaid', value: money(s.totalPaid) },
          { label: 'Of which interest', value: money(s.totalInterest) },
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
      <Field label="Price" value={price} onChange={setPrice} suffix="€" />
      <Field label="Deposit" value={deposit} onChange={setDeposit} suffix="€" />
      <Field label="Interest rate" value={rate} onChange={setRate} suffix="% a year" />
      <Field label="Over" value={years} onChange={setYears} suffix="years" />
      <Field label="Running costs" value={running} onChange={setRunning} suffix="€/month" />
      <Field label="Your monthly income" value={income} onChange={setIncome} suffix="€" />
      <Result
        headline={{ label: 'All in, every month', value: money(perMonth) }}
        rows={[
          { label: 'Finance', value: money(s.payment) },
          { label: 'Running costs', value: money(num(running)) },
          { label: 'Share of income', value: `${share.toFixed(0)}%` },
          { label: 'Total interest', value: money(s.totalInterest) },
        ]}
      />
      {share > 0 && (
        <p className={`rounded-2xl p-3 text-sm ${share > 20 ? 'bg-amber-50 text-amber-800' : 'bg-brand-50 text-brand-700'}`}>
          {share > 20
            ? `That's ${share.toFixed(0)}% of your income going on one car. Comfortable is usually under 15–20%.`
            : `${share.toFixed(0)}% of your income — within the range most people find comfortable.`}
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
      <Field label="Price" value={price} onChange={setPrice} suffix="€" />
      <Field label="Deposit" value={depositPct} onChange={setDepositPct} suffix="%" />
      <Field label="Interest rate" value={rate} onChange={setRate} suffix="% a year" />
      <Field label="Over" value={years} onChange={setYears} suffix="years" />
      <Result
        headline={{ label: 'Mortgage each month', value: money(s.payment) }}
        rows={[
          { label: 'Deposit', value: money(deposit) },
          { label: 'Taxes & fees (~11%)', value: money(fees) },
          { label: 'Cash needed upfront', value: money(deposit + fees) },
          { label: 'Borrowed', value: money(borrowed) },
          { label: 'Total interest', value: money(s.totalInterest) },
        ]}
      />
      <p className="rounded-2xl bg-slate-50 p-3 text-xs text-muted">
        Fees are a rough 11% for Spain — transfer tax, notary and registry vary by region and by
        whether the place is new or resale. Ask your gestor for the real figure.
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
      <Field label="What you'd spend a month" value={spend} onChange={setSpend} suffix="€" />
      <Field label="Safe withdrawal rate" value={rate} onChange={setRate} suffix="%" />
      <Field label="Saving each month" value={saving} onChange={setSaving} suffix="€" />
      <Field label="Already invested" value={pot} onChange={setPot} suffix="€" />
      <Field label="Expected return" value={growth} onChange={setGrowth} suffix="% a year" />
      <Result
        headline={{ label: 'You would need', value: money(target) }}
        rows={[
          { label: 'At this pace', value: years == null ? 'Never at this rate' : `${years.toFixed(1)} years` },
          { label: 'Yearly spending', value: money(num(spend) * 12) },
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
      <Field label="Investing each month" value={monthly} onChange={setMonthly} suffix="€" />
      <Field label="Starting with" value={initial} onChange={setInitial} suffix="€" />
      <Field label="Expected return" value={rate} onChange={setRate} suffix="% a year" />
      <Field label="For" value={years} onChange={setYears} suffix="years" />
      <Result
        headline={{ label: `After ${num(years) || 0} years`, value: money(end) }}
        rows={[
          { label: 'You put in', value: money(paidIn) },
          { label: 'Growth', value: money(Math.max(0, end - paidIn)) },
        ]}
      />
      <p className="rounded-2xl bg-slate-50 p-3 text-xs text-muted">
        A steady return is an assumption, not a promise — real markets don't move in a straight line.
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
      <Field label="Outstanding balance" value={balance} onChange={setBalance} suffix="€" />
      <Field label="Current rate" value={current} onChange={setCurrent} suffix="%" />
      <Field label="New rate" value={next} onChange={setNext} suffix="%" />
      <Field label="Years left" value={years} onChange={setYears} suffix="years" />
      <Field label="Cost to switch" value={cost} onChange={setCost} suffix="€" />
      <Result
        headline={{
          label: r.monthlySaving > 0 ? 'Saved every month' : 'Extra every month',
          value: money(Math.abs(r.monthlySaving)),
        }}
        rows={[
          { label: 'Now', value: money(r.now) },
          { label: 'After switching', value: money(r.next) },
          {
            label: 'Pays for itself in',
            value: r.breakEvenMonths == null ? 'Never — it costs more' : `${r.breakEvenMonths} months`,
          },
          { label: 'Over the full term', value: money(r.lifetimeSaving) },
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
      <Field label="Amount today" value={amount} onChange={setAmount} suffix="€" />
      <Field label="Inflation" value={rate} onChange={setRate} suffix="% a year" />
      <Field label="In" value={years} onChange={setYears} suffix="years" />
      <Result
        headline={{ label: `Buys what ${money(worth)} buys today`, value: money(worth) }}
        rows={[
          { label: 'Purchasing power lost', value: money(lost) },
          { label: 'That is', value: `${num(amount) > 0 ? ((lost / num(amount)) * 100).toFixed(0) : 0}%` },
        ]}
      />
    </>
  )
}
