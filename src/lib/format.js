// Spain-localized currency + date helpers.
const eur = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
})

export const money = (n) => eur.format(Number(n) || 0)

// Compact form for tight spaces, e.g. "€1,2k"
export const moneyShort = (n) => {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1000) return '€' + (v / 1000).toFixed(1).replace('.0', '') + 'k'
  return eur.format(v)
}

export const monthLabel = (d = new Date()) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(d)

export const dayLabel = (iso) =>
  new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(iso))

// A calendar day as YYYY-MM-DD, read off the local clock.
//
// Never use toISOString() for this. It converts to UTC first, so local midnight
// anywhere east of Greenwich lands on the previous day: in Madrid the 1st of
// August came out as "2026-07-31", which silently shifted every month window
// (and every recurring charge) a day — and therefore a month — too early.
export const isoDay = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// First & last day of the current month as YYYY-MM-DD (for Supabase range queries).
export function monthRange(base = new Date()) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1)
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  return { start: isoDay(start), end: isoDay(end) }
}
