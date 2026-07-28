// Simplified IRPF estimate for an autónomo resident in the Comunidad de Madrid.
// ⚠️ ESTIMATE ONLY — for planning, not official tax advice. Real filing depends
// on many factors (Seguridad Social, reductions, family situation, etc.).
// Confirm with a gestor. Rates are the approx. combined state + Madrid 2024/25
// marginal brackets and can be tweaked here as the law changes.

const BRACKETS = [
  { upTo: 12450, rate: 0.18 },
  { upTo: 17707, rate: 0.227 },
  { upTo: 20200, rate: 0.248 },
  { upTo: 33007, rate: 0.278 },
  { upTo: 35200, rate: 0.324 },
  { upTo: 53407, rate: 0.359 },
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
