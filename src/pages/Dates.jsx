import { useState } from 'react'
import { useDates, daysUntil } from '../hooks/useDates'
import TopBar from '../components/TopBar'
import { money } from '../lib/format'
import { t } from '../lib/i18n'

const num = (s) => parseFloat((s || '0').replace(',', '.')) || 0
const fmt = (d) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(d)

export default function Dates() {
  const { dates, loading, addDate, deleteDate } = useDates()
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [onDate, setOnDate] = useState('')
  const [budget, setBudget] = useState('')
  const [recurring, setRecurring] = useState(true)

  const create = async () => {
    if (!title.trim() || !onDate) return
    await addDate({ title: title.trim(), on_date: onDate, budget: num(budget), recurring })
    setTitle(''); setOnDate(''); setBudget(''); setRecurring(true); setShowNew(false)
  }

  return (
    <div className="pb-28">
      <TopBar
        title={t('Important dates')}
        subtitle={t('Private to you')}
        back
        right={
          <button onClick={() => setShowNew((s) => !s)} className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white shadow-sm active:scale-95" aria-label={t('New date')}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        }
      />
      <div className="mx-auto max-w-md px-4 space-y-4">
        <p className="text-sm text-muted">
          {t('Plan ahead for birthdays, anniversaries and holidays — set a budget so gifts never blow the month. Only you can see these.')}
        </p>

        {showNew && (
          <div className="card space-y-3">
            <div>
              <label className="label">{t('What is it?')}</label>
              <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("e.g. Adi's birthday")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('Date')}</label>
                <input className="field" type="date" value={onDate} onChange={(e) => setOnDate(e.target.value)} />
              </div>
              <div>
                <label className="label">{t('Budget (€)')}</label>
                <input className="field" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-5 w-5" />
              {t('Repeats every year')}
            </label>
            <button className="btn-primary w-full" onClick={create}>{t('Add date')}</button>
          </div>
        )}

        {loading && <p className="text-muted">{t('Loading…')}</p>}
        {!loading && dates.length === 0 && !showNew && (
          <div className="card py-10 text-center">
            <p className="text-4xl">🎂</p>
            <p className="mt-2 font-semibold">{t('No dates yet')}</p>
            <p className="text-muted text-sm">{t('Add birthdays and holidays to plan for them.')}</p>
            <button className="btn-primary mt-4 inline-flex" onClick={() => setShowNew(true)}>{t('Add a date')}</button>
          </div>
        )}

        {dates.map((d) => {
          const days = daysUntil(d._next)
          const soon = days <= 30
          return (
            <div key={d.id} className="card flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold truncate">{d.title}</p>
                <p className="text-sm text-muted">
                  {fmt(d._next)}{d.recurring ? ` · ${t('yearly')}` : ''}{d.budget > 0 ? ` · ${t('budget {amount}', { amount: money(d.budget) })}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${soon ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-muted'}`}>
                  {days === 0 ? t('Today!') : days === 1 ? t('Tomorrow') : t('{n} days', { n: days })}
                </span>
                <button onClick={() => deleteDate(d.id)} className="text-slate-300 hover:text-red-500" aria-label={t('Delete')}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
