import { useEffect, useState } from 'react'
import { useTax } from '../hooks/useTax'
import { estimate } from '../lib/tax'
import { toCSV, downloadCSV } from '../lib/csv'
import TopBar from '../components/TopBar'
import { money } from '../lib/format'

const num = (s) => parseFloat((String(s) || '0').replace(',', '.')) || 0
const field = (v, set, ph) => (
  <input className="field" inputMode="decimal" value={v} onChange={(e) => set(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder={ph} />
)

export default function Tax() {
  const { profile, businessThisYear, businessRows, save } = useTax()
  const [income, setIncome] = useState('')
  const [ss, setSs] = useState('')
  const [accountant, setAccountant] = useState('')
  const [extra, setExtra] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setIncome(profile.annual_income ? String(profile.annual_income) : '')
      setSs(profile.monthly_ss ? String(profile.monthly_ss) : '')
      setAccountant(profile.accountant_annual ? String(profile.accountant_annual) : '')
      setExtra(profile.extra_expenses ? String(profile.extra_expenses) : '')
    }
  }, [profile])

  // Project the full year from what's logged so far.
  const monthsElapsed = new Date().getMonth() + 1
  const projectedBiz = monthsElapsed > 0 ? (businessThisYear / monthsElapsed) * 12 : businessThisYear
  const ssAnnual = num(ss) * 12
  const deductions = projectedBiz + ssAnnual + num(accountant) + num(extra)
  const est = estimate(num(income), deductions)
  const netInPocket = est.netAfterTax // revenue − all deductions − IRPF

  const doSave = async () => {
    await save({
      annual_income: num(income),
      monthly_ss: num(ss),
      accountant_annual: num(accountant),
      extra_expenses: num(extra),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const exportCSV = () => {
    const csv = toCSV(businessRows, [
      { key: 'spent_at', label: 'Date' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount (EUR)' },
      { key: 'note', label: 'Note' },
    ])
    downloadCSV(`business-expenses-${new Date().getFullYear()}.csv`, csv)
  }

  return (
    <div className="pb-28">
      <TopBar title="Business tax" subtitle={`Autónomo · Madrid · ${new Date().getFullYear()} projection`} back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Inputs */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">Your numbers</h2>
          <div><label className="label">Expected annual revenue (€)</label>{field(income, setIncome, 'e.g. 60000')}</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Social security / month (€)</label>{field(ss, setSs, 'e.g. 300')}</div>
            <div><label className="label">Accountant / year (€)</label>{field(accountant, setAccountant, 'e.g. 600')}</div>
          </div>
          <div><label className="label">Other deductible expenses / year (€)</label>{field(extra, setExtra, '0')}</div>
          <div className="rounded-2xl bg-slate-50 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Business expenses logged so far</span><b>{money(businessThisYear)}</b></div>
            <div className="flex justify-between"><span className="text-muted">→ projected for full year</span><b>{money(projectedBiz)}</b></div>
          </div>
          <button className="btn-primary w-full" onClick={doSave}>{saved ? 'Saved ✓' : 'Save'}</button>
        </div>

        {/* Projection hero */}
        <div className="card bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <p className="text-white/80 text-sm">Projected net in your pocket this year</p>
          <p className="mt-1 text-4xl font-bold">{money(netInPocket)}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/15 p-3">
              <p className="text-white/80">Est. income tax (IRPF)</p>
              <p className="text-lg font-semibold">{money(est.tax)}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3">
              <p className="text-white/80">Effective rate</p>
              <p className="text-lg font-semibold">{Math.round(est.effectiveRate * 100)}%</p>
            </div>
          </div>
        </div>

        {/* Full-year breakdown */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-1">Projected year</h2>
          <div className="flex justify-between py-1"><span className="text-muted">Revenue</span><b>{money(num(income))}</b></div>
          <div className="flex justify-between py-1"><span className="text-muted">− Business expenses</span><b>{money(projectedBiz)}</b></div>
          <div className="flex justify-between py-1"><span className="text-muted">− Social security</span><b>{money(ssAnnual)}</b></div>
          <div className="flex justify-between py-1"><span className="text-muted">− Accountant</span><b>{money(num(accountant))}</b></div>
          {num(extra) > 0 && <div className="flex justify-between py-1"><span className="text-muted">− Other deductibles</span><b>{money(num(extra))}</b></div>}
          <div className="flex justify-between py-1 border-t border-slate-100 mt-1 pt-2"><span className="text-muted">= Taxable profit</span><b>{money(est.profit)}</b></div>
          <div className="flex justify-between py-1"><span className="text-muted">− Estimated IRPF</span><b>{money(est.tax)}</b></div>
          <div className="flex justify-between py-1 border-t border-slate-100 mt-1 pt-2"><span className="font-medium">= Net in your pocket</span><b className="text-brand-600">{money(netInPocket)}</b></div>
        </div>

        {/* Recommendation */}
        <div className="card">
          <h2 className="font-semibold text-lg">💡 What this means</h2>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />Your deductions cut your tax by about <b>{money(est.taxSaved)}</b> this year.</li>
            <li className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />Every extra €100 of legitimate business expense saves you ~<b>{money(est.marginalRate * 100)}</b> in tax (your {Math.round(est.marginalRate * 100)}% marginal rate).</li>
            <li className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />Set aside roughly <b>{money(est.tax)}</b> for IRPF{ssAnnual > 0 ? ` plus ${money(ssAnnual)} for social security` : ''} across the year.</li>
          </ul>
        </div>

        <button className="btn-ghost w-full" onClick={exportCSV} disabled={businessRows.length === 0}>
          ⬇︎ Export business expenses for gestor (CSV)
        </button>

        <p className="text-xs text-muted px-1">
          ⚠️ Projection for planning only — not official tax advice. Uses approximate combined state + Madrid IRPF
          brackets, treats social security as deductible, and extrapolates your logged expenses to a full year.
          Confirm real figures with your gestor.
        </p>
      </div>
    </div>
  )
}
