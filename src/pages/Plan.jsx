import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMoney } from '../hooks/useMoney'
import { useRecurring } from '../hooks/useRecurring'
import { useSavings } from '../hooks/useSavings'
import { useAccounts } from '../hooks/useAccounts'
import { useDates, daysUntil } from '../hooks/useDates'
import TopBar from '../components/TopBar'
import { money } from '../lib/format'

// Everything that stands on its own every month, as opposed to the one-off
// transactions that go through Add. Settings is for how the app behaves; this
// is for what your money already does before you spend anything.
export default function Plan() {
  const { profile } = useAuth()
  const { bills } = useMoney()
  const { items: recurring } = useRecurring()
  const { goals, savedByGoal } = useSavings()
  const { active: accounts, total: accountsTotal } = useAccounts()
  const { dates } = useDates()

  const salary = Number(profile?.monthly_income ?? 0)
  const billsTotal = bills.reduce((t, b) => t + Number(b.amount || 0), 0)
  const activeRecurring = recurring.filter((r) => r.active && r.kind === 'expense')
  const recurringTotal = activeRecurring.reduce((t, r) => t + Number(r.amount || 0), 0)
  const soonest = dates
    .map((d) => ({ ...d, days: daysUntil(d._next) }))
    .sort((a, b) => a.days - b.days)[0]

  return (
    <div className="pb-28">
      <TopBar title="Every month" subtitle="What repeats, and what you're saving for" />
      <div className="mx-auto max-w-md px-4 space-y-3">
        <Row
          to="/accounts"
          emoji="🏦"
          title="Accounts"
          sub={accounts.length ? `${accounts.length} account${accounts.length > 1 ? 's' : ''} · ${money(accountsTotal)}` : 'Not set up yet'}
        />
        <Row
          to="/salary"
          emoji="💶"
          title="Salary"
          sub={salary > 0 ? `${money(salary)} a month` : 'Not set yet'}
        />
        <Row
          to="/bills"
          emoji="🏠"
          title="Rent & bills"
          sub={bills.length ? `${bills.length} bill${bills.length > 1 ? 's' : ''} · ${money(billsTotal)} a month` : 'Nothing added yet'}
        />
        <Row
          to="/recurring"
          emoji="🔁"
          title="Monthly expenses"
          sub={activeRecurring.length ? `${activeRecurring.length} active · ${money(recurringTotal)} a month` : 'Nothing repeating yet'}
        />
        <Row
          to="/savings"
          emoji="🎯"
          title="Savings goals"
          sub={goals.length ? `${goals.length} goal${goals.length > 1 ? 's' : ''} · ${money(Object.values(savedByGoal).reduce((t, v) => t + Number(v || 0), 0))} put aside` : 'No goals yet'}
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
