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

// `onClose`: present when opened as a sheet from Wealth rather than as its
// own route.
export default function Tax({ onClose }) {
  const { profile, businessThisYear, businessRows, businessByCategory, deductibleThisYear, save, saveCategoryPct } = useTax()
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

  // Project the full year from what's logged so far — based on when you
  // actually started logging business expenses, not just the calendar month
  // number (otherwise someone who started in June gets July divided by 7).
  const now = new Date()
  const earliestRow = businessRows.reduce((min, r) => {
    const d = new Date(r.spent_at)
    return !min || d < min ? d : min
  }, null)
  const monthsElapsed = earliestRow
    ? Math.max(1, (now.getFullYear() - earliestRow.getFullYear()) * 12 + (now.getMonth() - earliestRow.getMonth()) + 1)
    : now.getMonth() + 1
  const projectedDeductible = monthsElapsed > 0 ? (deductibleThisYear / monthsElapsed) * 12 : deductibleThisYear
  const ssAnnual = num(ss) * 12
  const deductions = projectedDeductible + ssAnnual + num(accountant) + num(extra)
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
    const pctByCat = Object.fromEntries(businessByCategory.map((c) => [c.category, c.pct]))
    const csv = toCSV(businessRows, [
      { key: 'spent_at', label: 'Date' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount (EUR)' },
      { label: '% Deductible', get: (e) => pctByCat[e.category] ?? 100 },
      { label: 'Deductible amount (EUR)', get: (e) => Math.round(Number(e.amount) * ((pctByCat[e.category] ?? 100) / 100) * 100) / 100 },
      { key: 'note', label: 'Note' },
    ])
    downloadCSV(`business-expenses-${new Date().getFullYear()}.csv`, csv)
  }

  return (
    <div className={onClose ? '' : 'pb-28'}>
      <TopBar title="Business tax" subtitle={`Autónomo · Madrid · ${new Date().getFullYear()} projection`} back onBack={onClose} />
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
            <div className="flex justify-between"><span className="text-muted">→ of which deductible</span><b>{money(deductibleThisYear)}</b></div>
            <div className="flex justify-between"><span className="text-muted">→ deductible, projected for full year</span><b>{money(projectedDeductible)}</b></div>
          </div>
          <button className="btn-primary w-full" onClick={doSave}>{saved ? 'Saved ✓' : 'Save'}</button>
        </div>

        {/* Per-category deductibility — set by you or your gestor, never assumed */}
        {businessByCategory.length > 0 && (
          <div className="card space-y-1">
            <h2 className="font-semibold text-lg">Deductible % by category</h2>
            <p className="text-sm text-muted mb-2">
              Set what your gestor says is deductible per category — defaults to 100%. This is documentation, not tax advice.
            </p>
            <div className="divide-y divide-slate-100">
              {businessByCategory.map((c) => (
                <CategoryPctRow key={c.category} row={c} onSave={(pct) => saveCategoryPct(c.category, pct)} />
              ))}
            </div>
          </div>
        )}

        {/* Projection hero — the same mint-200 treatment as every other
            hero number in the app (Wealth, Home, Together…), not the old
            one-off brand gradient this used to be. */}
        <div className="rounded-xl3 bg-mint-200 p-5">
          <p className="label mb-0 text-center text-brand-700/70">Projected net in your pocket this year</p>
          <p className="figure mt-1 text-center text-brand-700">{money(netInPocket)}</p>
          <div className="mt-4 grid grid-cols-2 divide-x divide-brand-500/15 border-t border-brand-500/15 pt-3">
            <div className="text-center">
              <p className="text-xs font-medium text-brand-700/70">Est. income tax (IRPF)</p>
              <p className="tnum font-bold text-brand-700">{money(est.tax)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-brand-700/70">Effective rate</p>
              <p className="tnum font-bold text-brand-700">{Math.round(est.effectiveRate * 100)}%</p>
            </div>
          </div>
        </div>

        {/* Full-year breakdown */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-1">Projected year</h2>
          <div className="flex justify-between py-1"><span className="text-muted">Revenue</span><b>{money(num(income))}</b></div>
          <div className="flex justify-between py-1"><span className="text-muted">− Deductible business expenses</span><b>{money(projectedDeductible)}</b></div>
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

// One category row: total logged, editable deductible %, resulting deductible amount.
function CategoryPctRow({ row, onSave }) {
  const [v, setV] = useState(String(row.pct))
  useEffect(() => { setV(String(row.pct)) }, [row.pct])

  const commit = () => {
    const pct = Math.max(0, Math.min(100, Math.round(num(v))))
    if (pct !== row.pct) onSave(pct)
    setV(String(pct))
  }

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{row.category}</p>
        <p className="text-xs text-muted">{money(row.total)} logged · {money(row.deductible)} deductible</p>
      </div>
      <div className="flex items-center gap-1 rounded-xl bg-slate-50 px-2.5 py-1.5">
        <input
          className="w-10 bg-transparent text-right outline-none font-semibold"
          inputMode="numeric"
          value={v}
          onChange={(e) => setV(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={commit}
        />
        <span className="text-muted">%</span>
      </div>
    </div>
  )
}
