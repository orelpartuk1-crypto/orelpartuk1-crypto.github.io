// Finds every t('…') call in the app and reports which have no Spanish yet.
// The design means an untranslated string silently renders in English, which
// is the right failure mode at runtime but means nothing complains at build
// time — so this is the only thing that will actually tell us what's missing.
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { es } from '../src/lib/translations/es.js'

const ROOT = new URL('../src', import.meta.url).pathname
const files = []
;(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.jsx?$/.test(p) && !p.includes('/translations/')) files.push(p)
  }
})(ROOT)

// t('...') / t("...") / t(`...`) — first argument only, no nested quotes.
const CALL = /\bt\(\s*(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g

const missing = new Map()
let total = 0
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(CALL)) {
    const key = m[2].replace(/\\'/g, "'").replace(/\\"/g, '"')
    total++
    if (!(key in es)) {
      if (!missing.has(key)) missing.set(key, new Set())
      missing.get(key).add(f.replace(ROOT + '/', ''))
    }
  }
}

console.log(`t() calls found: ${total}`)
console.log(`unique keys translated: ${Object.keys(es).length}`)
console.log(`MISSING Spanish: ${missing.size}`)
for (const [k, where] of missing) {
  console.log(`  ${JSON.stringify(k)}  <- ${[...where].join(', ')}`)
}
