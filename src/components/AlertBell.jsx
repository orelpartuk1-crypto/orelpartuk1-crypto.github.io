import { useEffect, useState } from 'react'

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
  useEffect(() => {
    const live = new Set(alerts.map((a) => a.id))
    setDismissed((prev) => {
      const next = new Set([...prev].filter((id) => live.has(id)))
      if (next.size !== prev.size) localStorage.setItem(KEY, JSON.stringify([...next]))
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
        aria-label={unseen.length ? `${unseen.length} alerts` : 'Alerts'}
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 animate-fade-in" onClick={() => setOpen(false)}>
          <div
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-4 pb-8 animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
            <div className="mx-auto max-w-md space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-bold">Worth knowing</h2>
                {alerts.length > 0 && (
                  <button className="text-sm font-semibold text-brand-600" onClick={dismissAll}>
                    Mark all seen
                  </button>
                )}
              </div>

              {alerts.length === 0 && (
                <p className="py-10 text-center text-muted">Nothing needs you right now.</p>
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
                  </div>
                  {!dismissed.has(a.id) && (
                    <button onClick={() => dismiss(a.id)} className="shrink-0 text-sm font-semibold underline">
                      Seen
                    </button>
                  )}
                </div>
              ))}

              <button className="btn-ghost mt-2 w-full" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
