import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRecurring } from '../hooks/useRecurring'
import { useDates } from '../hooks/useDates'
import { upcomingPayments } from '../lib/upcoming'
import { money, dayLabel } from '../lib/format'
import { t } from '../lib/i18n'
import TopBar from '../components/TopBar'
import { Screen, Stagger, Item } from '../components/motion'

const ICON = { date: '🎁', income: '💰', recurring: '🔁' }

// Everything still to come, in and out, over the next three months. Home shows
// the next week; this is the whole runway.
export default function Upcoming() {
  const { user } = useAuth()
  const { items: recurringItems } = useRecurring()
  const { dates } = useDates()

  const rows = useMemo(
    () => upcomingPayments({ recurring: recurringItems, dates, myId: user?.id, withinDays: 92 }),
    [recurringItems, dates, user?.id]
  )

  const totalOut = rows.filter((r) => r.direction === 'out').reduce((t, r) => t + r.amount, 0)
  const totalIn = rows.filter((r) => r.direction === 'in').reduce((t, r) => t + r.amount, 0)

  // Grouped by how soon, because "this week" and "in two months" are different
  // kinds of concern.
  const buckets = useMemo(() => {
    const b = [
      { key: 'week', label: t('Next 7 days'), rows: [] },
      { key: 'month', label: t('Rest of the month'), rows: [] },
      { key: 'later', label: t('Later'), rows: [] },
    ]
    for (const r of rows) {
      if (r.days <= 7) b[0].rows.push(r)
      else if (r.days <= 31) b[1].rows.push(r)
      else b[2].rows.push(r)
    }
    return b.filter((x) => x.rows.length)
  }, [rows])

  return (
    <div className="pb-28">
      <TopBar title={t('Upcoming')} subtitle={t('The next three months')} back />
      <Screen className="mx-auto max-w-md px-4 space-y-4">
        <div className="rounded-xl3 bg-mint-200 p-5">
          <div className="grid grid-cols-2 divide-x divide-brand-500/15">
            <div className="text-center">
              <p className="text-xs font-medium text-brand-700/70">{t('Going out')}</p>
              <p className="tnum text-xl font-bold text-spend">{money(totalOut)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-brand-700/70">{t('Coming in')}</p>
              <p className="tnum text-xl font-bold text-earn">{money(totalIn)}</p>
            </div>
          </div>
        </div>

        {rows.length === 0 && (
          <p className="py-12 text-center text-muted">{t("Nothing scheduled. Add a recurring charge and it'll show up here.")}</p>
        )}

        {buckets.map((b) => (
          <Item key={b.key} className="card">
            <h2 className="label">{b.label}</h2>
            <Stagger className="divide-y divide-slate-100">
              {b.rows.map((u) => (
                <Item key={u.id}>
                  <div className="flex items-center gap-3 py-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-base">
                      {ICON[u.kind] || '🔁'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{u.label}</span>
                      <span className="block text-xs text-muted">
                        {u.days === 0 ? t('Today') : u.days === 1 ? t('Tomorrow') : t('In {n} days', { n: u.days })} · {dayLabel(u.date)}
                      </span>
                    </span>
                    {u.amount > 0 && (
                      <span className={`tnum shrink-0 font-semibold ${u.direction === 'in' ? 'text-earn' : 'text-spend'}`}>
                        {u.direction === 'in' ? '+' : '−'}{money(u.amount)}
                      </span>
                    )}
                  </div>
                </Item>
              ))}
            </Stagger>
          </Item>
        ))}
      </Screen>
    </div>
  )
}
