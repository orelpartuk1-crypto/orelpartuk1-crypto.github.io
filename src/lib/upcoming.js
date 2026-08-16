import { isoDay } from './format'

// What is still due this month, worked out from things you already told the app
// about: standing bills, monthly charges, and important dates. Nothing new is
// stored — this is a reading of existing data, not a second copy of it.

const num = (v) => Number(v) || 0

// A monthly item lands on the same day each month. Bills and recurring charges
// don't carry a day of their own, so they're treated as due on the 1st, which
// is when materialize_recurring actually creates them.
function nextOccurrence(dayOfMonth, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), dayOfMonth)
  if (d < new Date(from.getFullYear(), from.getMonth(), from.getDate())) {
    return new Date(from.getFullYear(), from.getMonth() + 1, dayOfMonth)
  }
  return d
}

export function upcomingPayments({
  bills = [],
  recurring = [],
  dates = [],
  myId = null,
  now = new Date(),
  withinDays = 45,
} = {}) {
  const out = []
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysTo = (d) => Math.round((d - today) / 86400000)

  for (const b of bills) {
    if (b.active === false) continue
    const when = nextOccurrence(1, now)
    // You feel a bill either as the whole amount you pay out, or as the share
    // you reimburse — never both.
    const amount = b.payer === myId ? num(b.amount) : num(b.other_share)
    if (amount <= 0) continue
    out.push({
      id: `bill-${b.id}`,
      kind: 'bill',
      label: b.name || 'Bill',
      amount,
      direction: 'out',
      date: isoDay(when),
      days: daysTo(when),
    })
  }

  for (const r of recurring) {
    if (!r.active) continue
    const when = nextOccurrence(1, now)
    out.push({
      id: `rec-${r.id}`,
      kind: r.kind === 'income' ? 'income' : 'recurring',
      label: r.name,
      amount: num(r.amount),
      direction: r.kind === 'income' ? 'in' : 'out',
      date: isoDay(when),
      days: daysTo(when),
    })
  }

  for (const d of dates) {
    if (!d._next) continue
    const days = daysTo(new Date(d._next.getFullYear(), d._next.getMonth(), d._next.getDate()))
    if (days < 0) continue
    out.push({
      id: `date-${d.id}`,
      kind: 'date',
      label: d.title,
      amount: num(d.budget),
      direction: 'out',
      date: isoDay(d._next),
      days,
    })
  }

  return out
    .filter((r) => r.days >= 0 && r.days <= withinDays)
    .sort((a, b) => a.days - b.days || b.amount - a.amount)
}

// Everything worth a badge on the bell, newest concern first. Derived, not
// stored — so nothing here can drift out of sync with the numbers it describes.
export function buildAlerts({
  budgetMap = {},
  spendByCategory = {},
  upcoming = [],
  settle = null,
  nameOf = () => '',
  myId = null,
} = {}) {
  const alerts = []

  for (const [category, limit] of Object.entries(budgetMap)) {
    if (!(limit > 0)) continue
    const spent = num(spendByCategory[category])
    const ratio = spent / limit
    if (ratio >= 1) {
      alerts.push({
        id: `budget-over-${category}`,
        tone: 'bad',
        title: `${category} is over budget`,
        body: `${spent.toFixed(0)} spent of ${limit.toFixed(0)}.`,
      })
    } else if (ratio >= 0.8) {
      alerts.push({
        id: `budget-warn-${category}`,
        tone: 'warn',
        title: `${category} is close to its limit`,
        body: `${(limit - spent).toFixed(0)} left of ${limit.toFixed(0)}.`,
      })
    }
  }

  for (const u of upcoming) {
    if (u.days > 7 || u.direction === 'in' || u.amount <= 0) continue
    alerts.push({
      id: `due-${u.id}`,
      tone: u.days <= 2 ? 'warn' : 'info',
      title: `${u.label} is due ${u.days === 0 ? 'today' : u.days === 1 ? 'tomorrow' : `in ${u.days} days`}`,
      body: `${u.amount.toFixed(0)} out.`,
    })
  }

  if (settle && !settle.settled && settle.amount > 0) {
    const iOwe = settle.from === myId
    alerts.push({
      id: 'settle-open',
      tone: 'info',
      title: iOwe ? `You owe ${nameOf(settle.to)}` : `${nameOf(settle.from)} owes you`,
      body: `${settle.amount.toFixed(2)} still open between you.`,
    })
  }

  const rank = { bad: 0, warn: 1, info: 2 }
  return alerts.sort((a, b) => rank[a.tone] - rank[b.tone])
}
