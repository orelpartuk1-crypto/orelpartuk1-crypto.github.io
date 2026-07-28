// Money-coach logic. Pure functions over already zone-scoped expense rows,
// so the same helpers work for the Together and Mine zones.
import { money } from './format'

const num = (v) => Number(v) || 0
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const keyOf = (iso) => String(iso).slice(0, 7)
const shortMonth = (key) => {
  const [y, m] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(y, m - 1, 1))
}

// Monthly totals for a simple bar-chart trend (last `months`, including the
// current in-progress one), from the same zone-scoped history the coach uses.
// Shape matches components/TrendChart.jsx: [{ key, label, total }].
export function monthlyTotals(history = [], { months = 6, now = new Date() } = {}) {
  const buckets = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = monthKey(d)
    buckets.push({ key, label: shortMonth(key), total: 0 })
  }
  const index = Object.fromEntries(buckets.map((b, i) => [b.key, i]))
  for (const e of history) {
    const i = index[keyOf(e.spent_at)]
    if (i != null) buckets[i].total += num(e.amount)
  }
  return buckets
}

// ---------------------------------------------------------------------------
// 1) TREND-AWARE INSIGHTS — reasons over several completed months, not just
//    this-vs-last. Flags rising streaks, celebrates falling streaks (wins),
//    and spots categories running above their own recent average.
// ---------------------------------------------------------------------------
export function trendInsights({ history = [], now = new Date(), months = 6 } = {}) {
  const curKey = monthKey(now)

  // Completed month keys in the window, oldest -> newest (exclude current partial month).
  const keys = []
  for (let i = months - 1; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(monthKey(d))
  }
  if (keys.length < 3) return []
  const idx = Object.fromEntries(keys.map((k, i) => [k, i]))

  // Per-category series aligned to `keys`.
  const series = {}
  for (const e of history) {
    const k = keyOf(e.spent_at)
    if (k === curKey || idx[k] == null) continue
    ;(series[e.category] ||= new Array(keys.length).fill(0))[idx[k]] += num(e.amount)
  }

  const out = []
  for (const [category, vals] of Object.entries(series)) {
    const last3 = vals.slice(-3)
    const [a, b, c] = last3
    const avgPrior = vals.slice(0, -1).reduce((t, v) => t + v, 0) / (vals.length - 1)
    const trail = last3.map((v) => money(v)).join(' → ')

    // Rising streak: three completed months strictly up, latest meaningful.
    if (c >= 30 && c > b && b > a && a > 0) {
      out.push({ tone: 'warn', category, priority: 3, text: `${category} has climbed 3 months running (${trail}).` })
      continue
    }
    // Falling streak: a genuine, sustained cut — celebrate it.
    if (a >= 30 && c < b && b < a) {
      out.push({ tone: 'good', category, priority: 3, text: `Nice — ${category} is down 3 months running (${trail}). Keep it up! 🎉` })
      continue
    }
    // Above its own usual: latest completed month well over the trailing average.
    if (c >= 30 && avgPrior >= 15 && c > avgPrior * 1.4) {
      const pct = Math.round(((c - avgPrior) / avgPrior) * 100)
      out.push({ tone: 'warn', category, priority: 2, text: `${category} was ${money(c)} last month — ${pct}% above your usual ${money(avgPrior)}.` })
    }
  }

  return out.sort((x, y) => y.priority - x.priority).slice(0, 3)
}

// ---------------------------------------------------------------------------
// 2) MID-MONTH PACE FORECAST — projects the current month from the pace so far
//    and warns before a budget is blown, not after.
// ---------------------------------------------------------------------------
export function paceForecast({ expenses = [], budgets = [], monthDate = new Date(), now = new Date() } = {}) {
  const isCurrent = monthDate.getFullYear() === now.getFullYear() && monthDate.getMonth() === now.getMonth()
  if (!isCurrent) return { active: false, items: [], projectedTotal: 0 }

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const fraction = dayOfMonth / daysInMonth
  // Too early (no signal) or basically month-end (nothing to forecast).
  if (dayOfMonth < 4 || fraction >= 0.92) return { active: false, items: [], projectedTotal: 0 }

  const spentBy = {}
  let total = 0
  for (const e of expenses) {
    spentBy[e.category] = (spentBy[e.category] || 0) + num(e.amount)
    total += num(e.amount)
  }

  const limits = Object.fromEntries(budgets.map((bg) => [bg.category, num(bg.monthly_limit)]))
  const items = []
  for (const [category, spent] of Object.entries(spentBy)) {
    const limit = limits[category]
    if (!limit || limit <= 0) continue
    const projected = spent / fraction
    if (projected > limit * 1.05 && spent < limit) {
      // On pace to go over, but hasn't yet — the actionable window.
      items.push({ category, spent, projected, limit, over: projected - limit })
    }
  }
  items.sort((a, b) => b.over - a.over)

  return {
    active: true,
    dayOfMonth,
    daysInMonth,
    projectedTotal: total / fraction,
    items: items.slice(0, 3),
  }
}

// ---------------------------------------------------------------------------
// 3) ACTIONABLE NUDGES — turn unused budget into a one-tap move toward a goal.
// ---------------------------------------------------------------------------
export function savingsNudges({ expenses = [], budgets = [], goals = [], savedByGoal = {}, monthDate = new Date(), now = new Date() } = {}) {
  const isCurrent = monthDate.getFullYear() === now.getFullYear() && monthDate.getMonth() === now.getMonth()
  if (!isCurrent || budgets.length === 0) return []

  const spentBy = {}
  for (const e of expenses) spentBy[e.category] = (spentBy[e.category] || 0) + num(e.amount)

  // Unused budget = sum of headroom on categories that are under their limit.
  let headroom = 0
  for (const bg of budgets) {
    const limit = num(bg.monthly_limit)
    if (limit <= 0) continue
    headroom += Math.max(0, limit - (spentBy[bg.category] || 0))
  }
  headroom = Math.round(headroom)
  if (headroom < 20) return []

  // Prefer the closest-to-done goal that still needs funding.
  const openGoals = goals
    .map((g) => ({ ...g, saved: num(savedByGoal[g.id]), target: num(g.target_amount) }))
    .filter((g) => g.target > 0 && g.saved < g.target)
    .sort((a, b) => b.saved / b.target - a.saved / a.target)

  const nudges = []
  if (openGoals.length) {
    const g = openGoals[0]
    const remaining = g.target - g.saved
    const move = Math.min(headroom, remaining)
    nudges.push({
      text: `You have about ${money(headroom)} of unused budget so far this month. Move ${money(move)} toward “${g.name}” (${money(g.saved)} / ${money(g.target)})?`,
      cta: { label: 'Add to savings →', to: '/savings' },
    })
  } else {
    nudges.push({
      text: `You have about ${money(headroom)} of unused budget so far this month. Set a savings goal and put it to work.`,
      cta: { label: 'Create a goal →', to: '/savings' },
    })
  }
  return nudges
}
