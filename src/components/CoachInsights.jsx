import { insights } from '../lib/calc'
import { trendInsights } from '../lib/coach'
import { t } from '../lib/i18n'

const TONE_ICON = { good: '✅', warn: '⚠️', bad: '🔴', info: '💡' }

// What used to be a whole separate "Money coach" page, boiled down to the
// two things actually worth a glance this month. No page to leave for it —
// this sits right where "our analysis" or "your analysis" already are.
//
// `history` (optional): the same category, several completed months back —
// lets a real streak ("Restaurants has climbed 3 months running") outrank
// this-month-vs-last-month, which is all `insights()` alone can see.
export default function CoachInsights({ thisMonth, lastMonth, budgets = [], summary, history }) {
  const monthly = insights({ thisMonth, lastMonth, budgets, summary })
  const trend = history?.length ? trendInsights({ history }) : []
  // A genuine multi-month streak is worth more than a one-month comparison —
  // shown first, then whatever else this month itself has to say.
  const top = [...trend.map((i) => ({ tone: i.tone, text: i.text })), ...monthly].slice(0, 2)
  if (top.length === 0) return null

  return (
    <div className="card space-y-1.5">
      <h2 className="label mb-0">🧭 {t('Worth knowing')}</h2>
      {top.map((i, idx) => (
        <p key={idx} className="text-sm leading-snug text-ink">
          {TONE_ICON[i.tone] || '💡'} {i.text}
        </p>
      ))}
    </div>
  )
}
