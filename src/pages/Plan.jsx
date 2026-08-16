import { Link } from 'react-router-dom'
import { useRecurring } from '../hooks/useRecurring'
import { useDates, daysUntil } from '../hooks/useDates'
import TopBar from '../components/TopBar'
import { money } from '../lib/format'

// What repeats every month, as opposed to the one-off transactions that go
// through Add. Rent lives here too now — it's just a recurring expense like
// any other, split 50/50 automatically because it's a shared need.
export default function Plan() {
  const { items: recurring } = useRecurring()
  const { dates } = useDates()

  const activeRecurring = recurring.filter((r) => r.active && r.kind === 'expense')
  const recurringTotal = activeRecurring.reduce((t, r) => t + Number(r.amount || 0), 0)
  const soonest = dates
    .map((d) => ({ ...d, days: daysUntil(d._next) }))
    .sort((a, b) => a.days - b.days)[0]

  return (
    <div className="pb-28">
      <TopBar title="Every month" subtitle="What goes out before you spend a thing" back />
      <div className="mx-auto max-w-md px-4 space-y-3">
        <Row
          to="/recurring"
          emoji="🔁"
          title="Monthly expenses"
          sub={activeRecurring.length ? `${activeRecurring.length} active · ${money(recurringTotal)} a month` : 'Nothing repeating yet — add rent and subscriptions here'}
        />
        <Row
          to="/dates"
          emoji="🎂"
          title="Important dates"
          sub={soonest ? `${soonest.title} in ${soonest.days} day${soonest.days === 1 ? '' : 's'}` : 'Nothing coming up'}
        />
      </div>
    </div>
  )
}

function Row({ to, emoji, title, sub }) {
  return (
    <Link to={to} className="card flex items-center justify-between active:scale-[0.99]">
      <span className="flex min-w-0 items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <span className="min-w-0">
          <span className="block font-semibold">{title}</span>
          <span className="block truncate text-sm text-muted">{sub}</span>
        </span>
      </span>
      <span className="shrink-0 text-muted">›</span>
    </Link>
  )
}
