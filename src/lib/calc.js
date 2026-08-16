// Pure helpers for the dashboards.
// Model: whoever pays an expense spent 100% of it. Nothing is auto-split.
// A "who owes" amount only comes from expenses explicitly marked split=true
// (shared only) plus recurring bills (rent).

const num = (v) => Number(v) || 0
const sum = (arr, f = (e) => e.amount) => arr.reduce((t, e) => t + num(f(e)), 0)

// Drops categories flagged as not-spending (investments, transfers out to
// yourself). They are recorded, they move money, but calling them spending
// makes every "what did we spend" figure wrong.
export function onlySpending(expenses, notSpending) {
  if (!notSpending || notSpending.size === 0) return expenses
  return expenses.filter((e) => !notSpending.has(e.category))
}

export function summarize(expenses) {
  return {
    total: sum(expenses),
    needs: sum(expenses.filter((e) => e.spend_type === 'need')),
    treats: sum(expenses.filter((e) => e.spend_type === 'treat')),
    count: expenses.length,
  }
}

export function byCategory(expenses) {
  const map = new Map()
  for (const e of expenses) map.set(e.category, (map.get(e.category) || 0) + num(e.amount))
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
}

// Per category, how this month is tracking against what the same category cost
// last month — so you get the heads-up while there is still time to stop, not
// a post-mortem once the month is already worse.
//
// Categories under `floor` last month are skipped: a jump from €3 to €6 is
// noise, and flagging it would train you to ignore the warnings that matter.
export function vsLastMonth(thisMonth, lastMonth, { floor = 15, warnAt = 0.8 } = {}) {
  const prevMap = Object.fromEntries(byCategory(lastMonth).map((c) => [c.category, c.total]))
  const out = {}
  for (const { category, total: now } of byCategory(thisMonth)) {
    const prev = prevMap[category] || 0
    if (prev < floor) continue
    const ratio = now / prev
    const status = ratio > 1 ? 'over' : ratio >= warnAt ? 'warn' : 'ok'
    if (status === 'ok') continue
    out[category] = { now, prev, ratio, status, left: Math.max(prev - now, 0) }
  }
  return out
}

// How much each member paid, from a set of expenses.
export function paidByMember(expenses, members) {
  const out = {}
  for (const m of members) out[m.id] = 0
  for (const e of expenses) out[e.paid_by] = (out[e.paid_by] || 0) + num(e.amount)
  return out
}

// Aggregate the itemized groceries across a set of expenses -> what was bought.
export function groceryBreakdown(expenses) {
  const map = new Map()
  for (const e of expenses) {
    if (!Array.isArray(e.items)) continue
    for (const it of e.items) {
      if (!it?.name) continue
      const cur = map.get(it.name) || { name: it.name, total: 0, count: 0 }
      cur.total += num(it.price)
      cur.count += 1
      map.set(it.name, cur)
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total || b.count - a.count)
}

// How much the NON-payer owes the payer for one shared expense.
//  - explicit owed_amount (incl. 0) wins — the payer set it on the expense.
//  - otherwise the default rule: needs are split 50/50, treats each their own.
export function owedShare(e) {
  if (e.owed_amount != null) return Math.min(num(e.owed_amount), num(e.amount))
  return e.spend_type === 'need' ? num(e.amount) / 2 : 0
}

// What `userId` actually bears of a set of shared expenses:
//  - if they paid it, they bear the amount minus what the other owes them;
//  - otherwise they bear only their owed share.
export function myShareOfShared(sharedExpenses, userId) {
  let mine = 0
  for (const e of sharedExpenses) {
    const owed = owedShare(e)
    mine += e.paid_by === userId ? num(e.amount) - owed : owed
  }
  return mine
}

// What `userId` bears of the recurring bills (rent): payer bears the rest,
// the other bears their agreed share.
export function myShareOfBills(activeBills, userId) {
  let mine = 0
  for (const b of activeBills) {
    mine += b.payer === userId ? num(b.amount) - num(b.other_share) : num(b.other_share)
  }
  return mine
}

// Who owes whom across shared expenses (per-expense owed share) + rent bills.
export function settlement(expenses, members, activeBills = [], settlements = []) {
  if (members.length !== 2) return null
  const [a, b] = members
  const shared = expenses.filter((e) => e.scope === 'shared')

  // balA > 0 => a is owed money overall.
  let balA = 0
  for (const e of shared) {
    const owed = owedShare(e) // what the non-payer owes the payer
    if (e.paid_by === a.id) balA += owed
    else if (e.paid_by === b.id) balA -= owed
  }

  for (const bill of activeBills) {
    if (bill.payer === a.id) balA += num(bill.other_share)
    else if (bill.payer === b.id) balA -= num(bill.other_share)
  }

  // Money already handed over cancels the debt it was handed over for —
  // without this the dashboard would keep asking for a payment that was made.
  for (const s of settlements) {
    if (s.payer === a.id) balA += num(s.amount)
    else if (s.payer === b.id) balA -= num(s.amount)
  }

  const needsTotal = sum(shared.filter((e) => e.spend_type === 'need'))
  if (Math.abs(balA) < 0.01) return { settled: true, needsTotal, half: needsTotal / 2 }
  return {
    needsTotal,
    half: needsTotal / 2,
    ...(balA > 0
      ? { from: b.id, to: a.id, amount: Math.abs(balA) }
      : { from: a.id, to: b.id, amount: Math.abs(balA) }),
  }
}

// Shared TREATS are NOT split — this shows each person's share + how balanced.
export function treatBalance(expenses, members) {
  const treats = expenses.filter((e) => e.scope === 'shared' && e.spend_type === 'treat')
  const total = sum(treats)
  const paid = paidByMember(treats, members)
  const rows = members.map((m) => ({
    id: m.id,
    name: m.display_name,
    amount: paid[m.id] || 0,
    pct: total > 0 ? (paid[m.id] || 0) / total : 0,
  }))
  const gap = rows.length === 2 ? Math.abs(rows[0].pct - rows[1].pct) * 100 : 0
  return { total, rows, gap }
}

export function budgetStatus(spent, limit) {
  if (!limit || limit <= 0) return { ratio: 0, status: 'none' }
  const ratio = spent / limit
  let status = 'ok'
  if (ratio >= 1) status = 'over'
  else if (ratio >= 0.8) status = 'warn'
  return { ratio: Math.min(ratio, 1), rawRatio: ratio, status }
}

// Free, category-level insights: this month vs last month + budgets.
export function insights({ thisMonth, lastMonth, budgets = [], summary }) {
  const out = []
  const catNow = Object.fromEntries(byCategory(thisMonth).map((c) => [c.category, c.total]))
  const catPrev = Object.fromEntries(byCategory(lastMonth).map((c) => [c.category, c.total]))
  const budgetMap = Object.fromEntries(budgets.map((b) => [b.category, num(b.monthly_limit)]))

  for (const [cat, now] of Object.entries(catNow)) {
    const prev = catPrev[cat] || 0
    if (prev >= 20 && now >= 20 && now > prev * 1.4) {
      const pct = Math.round(((now - prev) / prev) * 100)
      out.push({ tone: 'warn', text: `${cat} is up ${pct}% vs last month (€${now.toFixed(0)} vs €${prev.toFixed(0)}).` })
    }
  }
  for (const [cat, now] of Object.entries(catNow)) {
    const lim = budgetMap[cat]
    if (lim > 0 && now > lim) out.push({ tone: 'bad', text: `Over budget on ${cat}: €${now.toFixed(0)} of €${lim.toFixed(0)}.` })
  }
  if (summary && summary.total > 0) {
    const treatPct = Math.round((summary.treats / summary.total) * 100)
    if (treatPct >= 40) out.push({ tone: 'warn', text: `Treats are ${treatPct}% of spending — a good place to trim to save more.` })
    else if (summary.count >= 5 && treatPct <= 15) out.push({ tone: 'good', text: `Nice discipline — treats are only ${treatPct}% of spending.` })
  }
  const top = byCategory(thisMonth)[0]
  if (top && top.total > 0) out.push({ tone: 'info', text: `Biggest category: ${top.category} (€${top.total.toFixed(0)}).` })
  return out.slice(0, 5)
}
