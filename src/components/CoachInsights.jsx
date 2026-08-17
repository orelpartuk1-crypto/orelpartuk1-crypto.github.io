import { insights } from '../lib/calc'

const TONE_ICON = { good: '✅', warn: '⚠️', bad: '🔴', info: '💡' }

// What used to be a whole separate "Money coach" page, boiled down to the
// two things actually worth a glance this month. No page to leave for it —
// this sits right where "our analysis" or "your analysis" already are.
export default function CoachInsights({ thisMonth, lastMonth, budgets = [], summary }) {
  const top = insights({ thisMonth, lastMonth, budgets, summary }).slice(0, 2)
  if (top.length === 0) return null

  return (
    <div className="card space-y-1.5">
      <h2 className="label mb-0">🧭 Worth knowing</h2>
      {top.map((i, idx) => (
        <p key={idx} className="text-sm leading-snug text-ink">
          {TONE_ICON[i.tone] || '💡'} {i.text}
        </p>
      ))}
    </div>
  )
}
