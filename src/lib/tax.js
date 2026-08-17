// Simplified IRPF estimate for an autónomo resident in the Comunidad de Madrid.
// ⚠️ ESTIMATE ONLY — for planning, not official tax advice. Real filing depends
// on many factors (Seguridad Social, reductions, family situation, etc.).
// Confirm with a gestor.
//
// Combined marginal rate = the nationwide state general scale + Madrid's own
// regional scale, added bracket-by-bracket. The two scales don't share
// threshold points, so the combined table has a break wherever EITHER one
// does — including two easy-to-miss narrow bands (20.5% and 31.3%) that only
// exist because one scale changes bracket slightly before the other.
//   State 2025:  9.5% / 12% / 15% / 18.5% / 22.5% / 24.5%
//     at  0 · 12,450 · 20,200 · 35,200 · 60,000 · 300,000
//   Madrid 2025: 8.5% / 10.7% / 12.8% / 17.4% / 20.5%
//     at  0 · 13,362.22 · 19,004.63 · 35,425.68 · 57,320.40
// Madrid's regional scale is deflated annually (Ley 5/2024) so its
// thresholds shift with inflation even when the state scale doesn't —
// re-verify both scales for the current tax year before trusting this.
const BRACKETS = [
  { upTo: 12450, rate: 0.18 },
  { upTo: 13362.22, rate: 0.205 },
  { upTo: 19004.63, rate: 0.227 },
  { upTo: 20200, rate: 0.248 },
  { upTo: 35200, rate: 0.278 },
  { upTo: 35425.68, rate: 0.313 },
  { upTo: 57320.4, rate: 0.359 },
  { upTo: 60000, rate: 0.39 },
  { upTo: 300000, rate: 0.43 },
  { upTo: Infinity, rate: 0.45 },
]

// Rough personal tax-free minimum (mínimo personal). Approximation.
export const PERSONAL_ALLOWANCE = 5550

// Progressive IRPF on a taxable base (after the personal allowance).
export function irpf(taxableBase) {
  const base = Math.max(0, taxableBase - PERSONAL_ALLOWANCE)
  let tax = 0
  let prev = 0
  for (const b of BRACKETS) {
    if (base <= prev) break
    const slice = Math.min(base, b.upTo) - prev
    tax += slice * b.rate
    prev = b.upTo
  }
  return tax
}

// Full estimate from annual revenue + deductible business expenses.
export function estimate(annualIncome, deductibleExpenses) {
  const income = Math.max(0, Number(annualIncome) || 0)
  const expenses = Math.max(0, Number(deductibleExpenses) || 0)
  const profit = Math.max(0, income - expenses)

  const taxWith = irpf(profit)                 // tax on profit after expenses
  const taxWithout = irpf(income)              // tax if you had deducted nothing
  const saved = Math.max(0, taxWithout - taxWith)

  return {
    income,
    expenses,
    profit,
    tax: taxWith,
    effectiveRate: profit > 0 ? taxWith / profit : 0,
    marginalRate: marginalRate(Math.max(0, profit - PERSONAL_ALLOWANCE)),
    taxSaved: saved,
    netAfterTax: profit - taxWith,
  }
}

// The marginal rate that applies at a given taxable amount (after allowance).
export function marginalRate(taxableAfterAllowance) {
  let prev = 0
  for (const b of BRACKETS) {
    if (taxableAfterAllowance <= b.upTo) return b.rate
    prev = b.upTo
  }
  return BRACKETS[BRACKETS.length - 1].rate
}
