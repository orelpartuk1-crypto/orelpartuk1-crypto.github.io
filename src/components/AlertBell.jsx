import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from './motion'
import { t } from '../lib/i18n'

// Alerts are derived on every render from the live numbers, so they can never
// drift out of sync with what they describe. Only "I've seen this" is stored,
// and only on this device — a dismissal isn't worth a table or a sync.
const KEY = 'db_dismissed_alerts'

const readDismissed = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

export default function AlertBell({ alerts = [] }) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(readDismissed)

  // An alert that resolved and came back should speak up again, so anything no
  // longer live is dropped from the dismissed set rather than kept forever.
  //
  // Except on a cold start: alerts are derived from expenses, budgets, dates
  // and settlements, none of which have loaded on first render, so `alerts`
  // is briefly []. Pruning against that empty set wiped every dismissal and
  // wrote the empty result straight to localStorage — so every single time
  // the app opened, everything you had already marked seen came back. That
  // is why notifications never disappeared. An empty list can't be told
  // apart from "not loaded yet", so it prunes nothing.
  useEffect(() => {
    if (alerts.length === 0) return
    const live = new Set(alerts.map((a) => a.id))
    setDismissed((prev) => {
      const next = new Set([...prev].filter((id) => live.has(id)))
      // Same contents: hand back the identical Set so React can skip the
      // re-render this effect would otherwise cause on every alerts change.
      if (next.size === prev.size) return prev
      localStorage.setItem(KEY, JSON.stringify([...next]))
      return next
    })
  }, [alerts])

  const unseen = alerts.filter((a) => !dismissed.has(a.id))

  const dismiss = (id) => {
    setDismissed((prev) => {
      const next = new Set(prev).add(id)
      localStorage.setItem(KEY, JSON.stringify([...next]))
      return next
    })
  }

  const dismissAll = () => {
    const next = new Set(alerts.map((a) => a.id))
    localStorage.setItem(KEY, JSON.stringify([...next]))
    setDismissed(next)
    setOpen(false)
  }

  const tone = {
    bad: 'bg-red-50 text-red-800',
    warn: 'bg-amber-50 text-amber-800',
    info: 'bg-brand-50 text-brand-700',
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card transition-transform duration-150 active:scale-90"
        aria-label={unseen.length ? t('{n} alerts', { n: unseen.length }) : t('Alerts')}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unseen.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-spend px-1 text-[11px] font-bold text-white">
            {unseen.length}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold">{t('Worth knowing')}</h2>
            {alerts.length > 0 && (
              <button className="text-sm font-semibold text-brand-600" onClick={dismissAll}>
                {t('Mark all seen')}
              </button>
            )}
          </div>

          {alerts.length === 0 && (
            <p className="py-10 text-center text-muted">{t('Nothing needs you right now.')}</p>
          )}

          {alerts.map((a) => (
            <div
              key={a.id}
              className={`flex items-start gap-3 rounded-2xl p-3 ${tone[a.tone] || tone.info} ${
                dismissed.has(a.id) ? 'opacity-50' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{a.title}</p>
                <p className="text-sm opacity-80">{a.body}</p>
                {/* Some alerts are things you can act on rather than just
                    read — those carry a destination and get a link. */}
                {a.to && (
                  <Link
                    to={a.to}
                    onClick={() => setOpen(false)}
                    className="mt-1 inline-block text-sm font-semibold underline"
                  >
                    {a.cta || t('Open')}
                  </Link>
                )}
              </div>
              {!dismissed.has(a.id) && (
                <button onClick={() => dismiss(a.id)} className="shrink-0 text-sm font-semibold underline">
                  {t('Seen')}
                </button>
              )}
            </div>
          ))}

          <button className="btn-ghost mt-2 w-full" onClick={() => setOpen(false)}>{t('Close')}</button>
        </div>
      </Sheet>
    </>
  )
}
