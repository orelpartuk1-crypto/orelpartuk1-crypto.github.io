import { money } from './format'

// Categories that are usually discretionary — where a light trim is painless.
// NEEDS are never suggested for cutting (groceries, rent, bills, health…).
const DISCRETIONARY = new Set([
  'Coffee', 'Restaurants', 'Nights Out', 'Experiences', 'Shopping', 'Travel',
  'Bars', 'Delivery', 'Takeaway', 'Entertainment', 'Subscriptions',
])

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const keyOf = (iso) => String(iso).slice(0, 7)
const num = (v) => Number(v) || 0

// Gentle, non-judgemental "you could free up a little here" ideas — but ONLY
// when a category is genuinely running above what's normal FOR YOU. A category
// being your biggest treat isn't a reason to trim it if it's always that size;
// only actual excess vs your own 6-month baseline is worth mentioning, and the
// suggested trim scales with how far over that baseline you are — never a
// flat percentage applied to whatever happens to be the largest category.
export function trimSuggestions({ expenses, history = [], goals = [], savedByGoal = {}, now = new Date(), months = 6 }) {
  const curKey = monthKey(now)

  const isDiscretionary = (e) => (e.spend_type === 'treat' || DISCRETIONARY.has(e.category)) && e.scope !== 'business'

  // This month's spend per category (already zone-scoped by the caller).
  const current = {}
  for (const e of expenses) {
    if (!isDiscretionary(e)) continue
    current[e.category] = (current[e.category] || 0) + num(e.amount)
  }
  const treatTotal = Object.values(current).reduce((t, v) => t + v, 0)

  // Baseline: average of the last `months - 1` COMPLETED months (excludes the
  // current, still-in-progress month so a big week early on doesn't skew it).
  const keys = []
  for (let i = months - 1; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(monthKey(d))
  }
  const sums = {}
  const seenMonths = {}
  for (const e of history) {
    if (!isDiscretionary(e)) continue
    const k = keyOf(e.spent_at)
    if (k === curKey || !keys.includes(k)) continue
    sums[e.category] = (sums[e.category] || 0) + num(e.amount)
    ;(seenMonths[e.category] ||= new Set()).add(k)
  }

  const candidates = Object.entries(current)
    .map(([category, monthly]) => {
      // Average over the whole window (months with no spend count as €0 —
      // that's the honest baseline, not just an average of months they spent).
      const baseline = (sums[category] || 0) / keys.length
      return { category, monthly, baseline, elevation: monthly - baseline }
    })
    // Only flag REAL excess: needs an established baseline, and to be
    // meaningfully (25%+) above it, not just "this happens to be big".
    .filter((c) => c.baseline >= 15 && c.monthly >= c.baseline * 1.25 && c.elevation >= 15)
    .sort((a, b) => b.elevation - a.elevation)
    .slice(0, 2)

  if (candidates.length === 0) return []

  // The goal closest to done that still needs funding — most motivating.
  const goal = goals
    .map((g) => ({ ...g, saved: Number(savedByGoal[g.id]) || 0, target: Number(g.target_amount) || 0 }))
    .filter((g) => g.target > 0 && g.saved < g.target)
    .sort((a, b) => b.saved / b.target - a.saved / a.target)[0]

  return candidates.map((c) => {
    // Trim halfway back toward the baseline — sized to the actual excess,
    // never a fixed percentage of the category.
    const freedMo = c.elevation / 2
    const freedYr = freedMo * 12
    const share = treatTotal > 0 ? Math.round((c.monthly / treatTotal) * 100) : 0

    let frame
    if (goal) {
      const remaining = goal.target - goal.saved
      const pctOfGoal = Math.min(99, Math.round((freedYr / remaining) * 100))
      frame = `Running ~${money(c.elevation)} above your usual ${money(c.baseline)}/mo. Ease back about halfway (~${money(freedMo)}/mo) and that's ${money(freedYr)}/yr toward “${goal.name}” — around ${pctOfGoal}% of what's left.`
    } else {
      frame = `Running ~${money(c.elevation)} above your usual ${money(c.baseline)}/mo. Ease back about halfway (~${money(freedMo)}/mo) and that's ${money(freedYr)}/yr you'd barely feel losing.`
    }
    return { category: c.category, monthly: c.monthly, baseline: c.baseline, freedMo, freedYr, share, frame }
  })
}

// Back-compat name used by the dashboard.
export const opportunityInsights = trimSuggestions
