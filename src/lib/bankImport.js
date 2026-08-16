// Reading a bank statement into expenses.
//
// The hard part isn't parsing — it's that the same purchase can already be in
// the app from a receipt scan or an Apple Pay automation. Importing blind would
// double every one of those, so matching against what's already there is a
// condition of this feature, not a nicety.

// Spanish exports use "1.234,56"; some use "1234.56". Decide by which
// separator comes last.
export function parseAmount(raw) {
  if (raw == null) return null
  let s = String(raw).trim().replace(/[€\s ]/g, '')
  if (!s) return null
  const neg = /^\(.*\)$/.test(s) || s.startsWith('-')
  s = s.replace(/[()]/g, '').replace(/^-/, '')
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/,/g, '')
  const n = parseFloat(s)
  if (!Number.isFinite(n)) return null
  return neg ? -n : n
}

// Banks write dates every which way. Only day-first and ISO appear in Spanish
// statements, so month-first is deliberately not guessed at.
export function parseDate(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
  if (m) {
    const [, d, mo, y] = m
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

// Split a CSV line honouring quoted fields.
function splitLine(line, sep) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === sep && !inQuotes) {
      out.push(cur); cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((c) => c.trim().replace(/^"|"$/g, ''))
}

const sniffSeparator = (line) => {
  const counts = [';', ',', '\t'].map((s) => [s, splitLine(line, s).length])
  counts.sort((a, b) => b[1] - a[1])
  return counts[0][1] > 1 ? counts[0][0] : ';'
}

// Statements often start with a few bank-header lines before the real table.
// The header row is the first line that splits into the most columns.
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  const sep = sniffSeparator(lines.find((l) => l.includes(';')) || lines[0])

  let headerIdx = 0
  let best = 0
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const n = splitLine(lines[i], sep).filter(Boolean).length
    if (n > best) { best = n; headerIdx = i }
  }

  const headers = splitLine(lines[headerIdx], sep)
  const rows = lines.slice(headerIdx + 1)
    .map((l) => splitLine(l, sep))
    .filter((cells) => cells.some((c) => c !== ''))
    .map((cells) => Object.fromEntries(headers.map((h, i) => [h || `col${i}`, cells[i] ?? ''])))
  return { headers, rows }
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const HINTS = {
  date: ['fecha operacion', 'fecha valor', 'fecha', 'date', 'data'],
  description: ['concepto', 'descripcion', 'description', 'detalle', 'movimiento', 'concept'],
  amount: ['importe', 'amount', 'cantidad', 'cargo', 'abono'],
  balance: ['saldo', 'balance'],
}

// Guess which column is which, so the common case needs no mapping at all.
export function guessColumns(headers) {
  const pick = (kind) => {
    for (const hint of HINTS[kind]) {
      const found = headers.find((h) => norm(h).includes(hint))
      if (found) return found
    }
    return null
  }
  return { date: pick('date'), description: pick('description'), amount: pick('amount'), balance: pick('balance') }
}

// Turn mapped rows into candidate expenses. Money in is skipped — a statement's
// credits are salary and transfers, which the app already models properly, and
// importing them as negative expenses would corrupt every total.
export function toCandidates(rows, mapping) {
  const out = []
  for (const r of rows) {
    const date = parseDate(r[mapping.date])
    const amount = parseAmount(r[mapping.amount])
    const description = String(r[mapping.description] ?? '').trim()
    if (!date || amount == null || amount === 0) continue
    if (amount > 0) continue // credit, not spending
    out.push({ date, description: description || 'Bank movement', amount: Math.abs(amount) })
  }
  return out
}

// A candidate is a likely duplicate when an expense of the same amount already
// sits within a few days of it. Card postings lag the purchase, so an exact
// date match would miss most real duplicates.
export function markDuplicates(candidates, existing, { dayWindow = 4 } = {}) {
  const byAmount = new Map()
  for (const e of existing) {
    const cents = Math.round(Number(e.amount) * 100)
    if (!byAmount.has(cents)) byAmount.set(cents, [])
    byAmount.get(cents).push(e)
  }
  const days = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000)

  return candidates.map((c) => {
    const cents = Math.round(c.amount * 100)
    const match = (byAmount.get(cents) || []).find((e) => days(e.spent_at, c.date) <= dayWindow)
    return { ...c, duplicateOf: match ? { id: match.id, spent_at: match.spent_at, note: match.note, category: match.category } : null }
  })
}
