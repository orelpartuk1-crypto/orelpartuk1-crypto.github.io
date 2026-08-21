// Generates supabase/functions/_shared/merchants.ts from src/lib/merchants.js.
//
// The shop -> category mapping has to exist in two runtimes: the browser (Add
// expense guessing a category as you type) and Deno (the Apple Pay automation
// logging an expense with nobody looking at a screen). Hand-copying it would
// mean every new shop silently works in one place and not the other — the
// exact class of drift that let the dead Clearbit logo source sit unnoticed.
//
// So there is one source of truth, and the copy is generated. Run:
//   npm run sync:merchants          # regenerate
//   npm run check:merchants         # fail if the copy is stale
import { readFileSync, writeFileSync } from 'node:fs'
import { KNOWN, MERCHANT_CATEGORY } from '../src/lib/merchants.js'

const OUT = new URL('../supabase/functions/_shared/merchants.ts', import.meta.url)

const header = `// GENERATED FILE — do not edit by hand.
// Source: src/lib/merchants.js  ·  Regenerate: npm run sync:merchants
//
// The browser and this Deno function must agree on what "Mercadona" is, so
// the mapping is generated from the app's own merchant list rather than
// copied. \`npm run check:merchants\` fails the moment they diverge.
`

const body = `
const KNOWN: Record<string, string> = ${JSON.stringify(KNOWN, null, 2)}

const MERCHANT_CATEGORY: Record<string, string> = ${JSON.stringify(MERCHANT_CATEGORY, null, 2)}

// Categories that are almost always a shared household cost. Mirrors
// SHARED_LEANING_CATEGORIES in src/lib/categories.js.
const SHARED_LEANING = new Set(['Groceries', 'Rent', 'Utilities', 'Home'])

const norm = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim()

// Longest known key that appears anywhere in the line wins, so
// "ZARA ESPANA S.A. - MADRID" still resolves to zara.com. Deliberately no
// guessing beyond the list: a wrong category on a silent auto-logged expense
// is worse than a plain "Other" the owner can correct.
export function merchantDomain(raw: string): string | null {
  const t = norm(raw)
  if (!t) return null
  const hit = Object.keys(KNOWN)
    .filter((k) => t.includes(k))
    .sort((a, b) => b.length - a.length)[0]
  return hit ? KNOWN[hit] : null
}

// Card networks append town and region — "Lidl, Madrid, Madrid". Only the
// first segment is the shop. Mirrors cleanMerchant in src/lib/merchants.js.
export function cleanMerchant(raw: string): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.split(',')[0].trim() || s
}

export function merchantCategory(raw: string): string | null {
  const d = merchantDomain(raw)
  return d ? MERCHANT_CATEGORY[d] || null : null
}

// What a merchant name implies for both fields at once. Scope follows the
// same rule the Add screen uses by hand: a shared-leaning category is a
// household cost, everything else is personal until told otherwise.
export function classify(raw: string): { category: string; scope: 'private' | 'shared' } {
  const category = merchantCategory(raw) || 'Other'
  return { category, scope: SHARED_LEANING.has(category) ? 'shared' : 'private' }
}
`

const generated = header + body
const mode = process.argv[2]
if (mode === '--check') {
  let current = ''
  try { current = readFileSync(OUT, 'utf8') } catch { /* missing counts as stale */ }
  if (current !== generated) {
    console.error('STALE: supabase/functions/_shared/merchants.ts no longer matches src/lib/merchants.js')
    console.error('Run: npm run sync:merchants')
    process.exit(1)
  }
  console.log(`merchants.ts is in sync (${Object.keys(KNOWN).length} names, ${Object.keys(MERCHANT_CATEGORY).length} domains)`)
} else {
  writeFileSync(OUT, generated)
  console.log(`wrote merchants.ts (${Object.keys(KNOWN).length} names, ${Object.keys(MERCHANT_CATEGORY).length} domains)`)
}
