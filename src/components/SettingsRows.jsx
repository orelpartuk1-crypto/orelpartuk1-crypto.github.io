import { Link } from 'react-router-dom'

// The grouped-list vocabulary both Settings and Profile are built from: a
// quiet section header over one card of rows. Shared deliberately — these two
// screens drifted apart last time each kept its own copy of a pattern, and a
// settings list looking subtly different from the profile list is exactly the
// kind of thing that reads as unfinished.
export function Group({ title, children, footer }) {
  return (
    <div>
      {title && <h2 className="label px-1">{title}</h2>}
      <div className="card divide-y divide-slate-100 !py-0">{children}</div>
      {footer && <p className="mt-1.5 px-1 text-xs text-muted">{footer}</p>}
    </div>
  )
}

// One row: icon, label, optional sub-line, then either a value + chevron (it
// opens something) or whatever control the caller hands to `right`.
export function Row({ icon, label, sub, value, to, onClick, right, danger, children }) {
  const body = (
    <>
      {icon != null && <span className="w-7 shrink-0 text-center text-xl">{icon}</span>}
      {children ?? (
        <span className="min-w-0 flex-1">
          <span className={`block font-medium ${danger ? 'text-spend' : ''}`}>{label}</span>
          {sub && <span className="block text-xs text-muted">{sub}</span>}
        </span>
      )}
      {value != null && <span className="min-w-0 shrink-0 truncate text-sm text-muted">{value}</span>}
      {right}
      {(to || onClick) && !right && <span className="shrink-0 text-muted">›</span>}
    </>
  )
  const cls =
    'flex w-full items-center gap-3 py-3.5 text-left transition-transform duration-100 active:scale-[0.99]'
  if (to) return <Link to={to} className={cls}>{body}</Link>
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{body}</button>
  return <div className={cls}>{body}</div>
}

export function Toggle({ on }) {
  return (
    <span
      className={`flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition ${
        on ? 'justify-end bg-brand-500' : 'justify-start bg-slate-200'
      }`}
    >
      <span className="h-6 w-6 rounded-full bg-white shadow" />
    </span>
  )
}
