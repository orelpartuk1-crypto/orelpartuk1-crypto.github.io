// Currency + date helpers. Euro by default (Madrid is where this is used),
// but the currency is a stored preference so the same numbers can be read in
// shekels or dollars.
//
// This is presentation only, and deliberately so: amounts are stored as plain
// numbers with no currency attached, so switching relabels what's on screen
// and converts nothing. Anything else would need real exchange rates and a
// migration of every historical row — a much bigger promise than "show me
// this in ₪".
export const CURRENCIES = {
  EUR: { symbol: '€', locale: 'es-ES', label: '€ Euro' },
  ILS: { symbol: '₪', locale: 'he-IL', label: '₪ Shekel' },
  USD: { symbol: '$', locale: 'en-US', label: '$ Dollar' },
}
const KEY = 'db_currency'

const readCurrency = () => {
  try {
    const c = localStorage.getItem(KEY)
    return c && CURRENCIES[c] ? c : 'EUR'
  } catch {
    return 'EUR'
  }
}

let current = readCurrency()
let fmt = buildFormatter(current)

function buildFormatter(code) {
  const c = CURRENCIES[code] || CURRENCIES.EUR
  return new Intl.NumberFormat(c.locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
  })
}

export const getCurrency = () => current
export const currencySymbol = () => (CURRENCIES[current] || CURRENCIES.EUR).symbol

// Changing currency re-labels every figure in the app, and the simplest way
// to be sure nothing is left showing the old symbol is a reload.
export function setCurrency(code) {
  if (!CURRENCIES[code]) return
  localStorage.setItem(KEY, code)
  current = code
  fmt = buildFormatter(code)
}

export const money = (n) => fmt.format(Number(n) || 0)

// Compact form for tight spaces, e.g. "€1,2k"
export const moneyShort = (n) => {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1000) return currencySymbol() + (v / 1000).toFixed(1).replace('.0', '') + 'k'
  return fmt.format(v)
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
