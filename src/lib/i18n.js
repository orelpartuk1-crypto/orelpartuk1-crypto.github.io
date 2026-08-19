// Translation, keyed by the English string itself rather than by invented
// ids ("home.saved_this_month"). Two reasons that matters here:
//
//  - A missing translation falls back to real English, never to a raw key
//    leaking onto the screen. With a few hundred strings across 25 screens,
//    something WILL be missed, and the failure mode should be "that bit is
//    still English", not "that bit says nav.wealth.title".
//  - Call sites stay readable: t('Save') instead of t('add.save_button'),
//    so the code still says what it renders.
//
// Interpolation is {named} placeholders: t('{n} entries', { n: 12 }).
import { es } from './translations/es.js'

const DICTS = { es }
const KEY = 'db_lang'

export const LANGUAGES = {
  en: { label: '🇬🇧 English' },
  es: { label: '🇪🇸 Español' },
}

const read = () => {
  try {
    const l = localStorage.getItem(KEY)
    if (l && LANGUAGES[l]) return l
    // First run follows the phone, so a Spanish handset opens in Spanish.
    return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en'
  } catch {
    return 'en'
  }
}

let lang = read()
let dict = DICTS[lang] || null

export const getLang = () => lang

// Changing language relabels every screen at once; a reload is the honest
// way to be certain nothing is left rendering the previous language.
export function setLang(next) {
  if (!LANGUAGES[next]) return
  localStorage.setItem(KEY, next)
  lang = next
  dict = DICTS[next] || null
}

// A key may carry a context prefix, "context|English text", for when one
// English word needs two different translations. "Income" is plural on the
// Home card (it pairs with "Expenses" — Ingresos/Gastos) but singular on the
// Add screen's type toggle (Gasto/Ingreso). English is identical either way,
// so the context is the only thing that can tell them apart. If no
// translation exists, the prefix is stripped and the plain English shows —
// never "toggle|Income".
export function t(text, vars) {
  const raw = dict && dict[text]
  const bar = text.indexOf('|')
  let out = raw || (bar > -1 ? text.slice(bar + 1) : text)
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v))
    }
  }
  return out
}
