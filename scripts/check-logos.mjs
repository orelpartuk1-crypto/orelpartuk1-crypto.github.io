// Proves every merchant domain still resolves to a real logo.
//
// This exists because Clearbit — the primary logo source — was shut down and
// nothing noticed. The app kept "working": it just quietly showed no logo for
// Zara, Mercadona and everything else. A build can't catch that, and neither
// can a screenshot of one screen. Run: npm run check:logos
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/lib/merchants.js', import.meta.url), 'utf8')
const domains = [...new Set(src.match(/'[a-z0-9.-]+\.[a-z]{2,}'/g).map((s) => s.slice(1, -1)))]

const SOURCES = [
  (d) => `https://icon.horse/icon/${d}`,
  (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=128`,
  (d) => `https://icons.duckduckgo.com/ip3/${d}.ico`,
]

// icon.horse answers 200 with a generated placeholder for a domain it can't
// reach, so "200" alone proves nothing. Real marks are comfortably bigger
// than the ~250B-1KB placeholders; anything under this is treated as a miss.
const MIN_BYTES = 700

async function probe(domain) {
  for (const make of SOURCES) {
    try {
      const res = await fetch(make(domain), { redirect: 'follow', signal: AbortSignal.timeout(12000) })
      if (!res.ok) continue
      const bytes = (await res.arrayBuffer()).byteLength
      if (bytes >= MIN_BYTES) return { ok: true, bytes }
    } catch { /* try the next source */ }
  }
  return { ok: false }
}

// Serial with a small gap: firing all of them at once gets rate-limited and
// reports false misses, which is exactly the wrong answer for a checker.
const misses = []
for (const d of domains) {
  const r = await probe(d)
  if (!r.ok) misses.push(d)
  await new Promise((r2) => setTimeout(r2, 120))
}

console.log(`domains checked: ${domains.length}`)
console.log(`resolving to a logo: ${domains.length - misses.length}`)
console.log(`MISSING: ${misses.length}`)
for (const m of misses) console.log(`  ${m}`)
process.exit(misses.length ? 1 : 0)
