import { Link } from 'react-router-dom'
import { useRecurring } from '../hooks/useRecurring'
import { useDates, daysUntil } from '../hooks/useDates'
import TopBar from '../components/TopBar'
import { money } from '../lib/format'
import { t } from '../lib/i18n'

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
      <TopBar title={t('Every month')} subtitle={t('What goes out before you spend a thing')} back />
      <div className="mx-auto max-w-md px-4 space-y-3">
        <Row
          to="/recurring"
          emoji="🔁"
          title={t('Monthly expenses')}
          sub={activeRecurring.length ? t('{n} active · {amount} a month', { n: activeRecurring.length, amount: money(recurringTotal) }) : t('Nothing repeating yet — add rent and subscriptions here')}
        />
        <Row
          to="/dates"
          emoji="🎂"
          title={t('Important dates')}
          sub={soonest ? (soonest.days === 1 ? t('{title} in 1 day', { title: soonest.title }) : t('{title} in {n} days', { title: soonest.title, n: soonest.days })) : t('Nothing coming up')}
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
