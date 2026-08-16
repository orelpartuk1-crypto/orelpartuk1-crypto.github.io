// Standard time-value-of-money maths. Pure functions, no data — nothing here
// reads or writes anything you've logged.

// Monthly payment on an amortising loan. A 0% loan is a real case (some car
// deals), and the standard formula divides by zero there, so it's split out.
export function monthlyPayment(principal, annualRatePct, years) {
  const n = Math.round(years * 12)
  if (!(principal > 0) || !(n > 0)) return 0
  const r = annualRatePct / 100 / 12
  if (r === 0) return principal / n
  return (principal * r) / (1 - Math.pow(1 + r, -n))
}

export function loanSummary(principal, annualRatePct, years) {
  const payment = monthlyPayment(principal, annualRatePct, years)
  const n = Math.round(years * 12)
  const totalPaid = payment * n
  return { payment, months: n, totalPaid, totalInterest: Math.max(0, totalPaid - principal) }
}

// What a monthly contribution grows to, with contributions made at the end of
// each month.
export function futureValue(monthly, annualRatePct, years, initial = 0) {
  const n = Math.round(years * 12)
  const r = annualRatePct / 100 / 12
  if (n <= 0) return initial
  if (r === 0) return initial + monthly * n
  const grown = initial * Math.pow(1 + r, n)
  const contributions = monthly * ((Math.pow(1 + r, n) - 1) / r)
  return grown + contributions
}

// The pot you need before withdrawing `annualSpend` at a given safe rate.
export function fireNumber(annualSpend, withdrawalRatePct = 4) {
  if (!(annualSpend > 0) || !(withdrawalRatePct > 0)) return 0
  return annualSpend / (withdrawalRatePct / 100)
}

// How long a monthly contribution takes to reach a target. Returns null when it
// never gets there, which is the honest answer rather than a huge number.
export function yearsToTarget(target, monthly, annualRatePct, initial = 0) {
  if (target <= initial) return 0
  if (!(monthly > 0) && annualRatePct <= 0) return null
  const r = annualRatePct / 100 / 12
  let balance = initial
  for (let m = 1; m <= 12 * 100; m++) {
    balance = balance * (1 + r) + monthly
    if (balance >= target) return m / 12
  }
  return null
}

// What today's money is worth after inflation.
export function realValue(amount, inflationPct, years) {
  return amount / Math.pow(1 + inflationPct / 100, years)
}

// Comparing a remortgage. Worth it only once the saving clears the switching
// cost, so the answer is the month that happens — not just the monthly delta.
export function refinance({ balance, currentRatePct, newRatePct, yearsLeft, switchingCost = 0 }) {
  const now = monthlyPayment(balance, currentRatePct, yearsLeft)
  const next = monthlyPayment(balance, newRatePct, yearsLeft)
  const monthlySaving = now - next
  const breakEvenMonths = monthlySaving > 0 ? Math.ceil(switchingCost / monthlySaving) : null
  return {
    now,
    next,
    monthlySaving,
    breakEvenMonths,
    lifetimeSaving: monthlySaving * Math.round(yearsLeft * 12) - switchingCost,
  }
}
