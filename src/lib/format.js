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

// First & last day of the current month as YYYY-MM-DD (for Supabase range queries).
export function monthRange(base = new Date()) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1)
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  const fmt = (d) => d.toISOString().slice(0, 10)
  return { start: fmt(start), end: fmt(end) }
}
