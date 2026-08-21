// GENERATED FILE — do not edit by hand.
// Source: src/lib/merchants.js  ·  Regenerate: npm run sync:merchants
//
// The browser and this Deno function must agree on what "Mercadona" is, so
// the mapping is generated from the app's own merchant list rather than
// copied. `npm run check:merchants` fails the moment they diverge.

const KNOWN: Record<string, string> = {
  "mercadona": "mercadona.es",
  "carrefour": "carrefour.es",
  "lidl": "lidl.es",
  "aldi": "aldi.es",
  "dia": "dia.es",
  "alcampo": "alcampo.es",
  "consum": "consum.es",
  "eroski": "eroski.es",
  "el corte ingles": "elcorteingles.es",
  "hipercor": "hipercor.com",
  "ahorramas": "ahorramas.com",
  "supercor": "supercor.es",
  "bonarea": "bonarea.cat",
  "zara": "zara.com",
  "bershka": "bershka.com",
  "stradivarius": "stradivarius.com",
  "pullandbear": "pullandbear.com",
  "pull and bear": "pullandbear.com",
  "massimo": "massimodutti.com",
  "massimo dutti": "massimodutti.com",
  "oysho": "oysho.com",
  "mango": "mango.com",
  "primark": "primark.com",
  "h&m": "hm.com",
  "hm": "hm.com",
  "uniqlo": "uniqlo.com",
  "decathlon": "decathlon.es",
  "nike": "nike.com",
  "adidas": "adidas.es",
  "ikea": "ikea.com",
  "leroy": "leroymerlin.es",
  "leroy merlin": "leroymerlin.es",
  "bricomart": "bricomart.es",
  "amazon": "amazon.es",
  "fnac": "fnac.es",
  "mediamarkt": "mediamarkt.es",
  "worten": "worten.es",
  "action": "action.com",
  "tiger": "flyingtiger.com",
  "starbucks": "starbucks.com",
  "mcdonalds": "mcdonalds.es",
  "mcdonald's": "mcdonalds.es",
  "burgerking": "burgerking.es",
  "burger king": "burgerking.es",
  "kfc": "kfc.es",
  "telepizza": "telepizza.es",
  "dominos": "dominos.es",
  "domino's": "dominos.es",
  "goiko": "goiko.com",
  "vips": "vips.es",
  "rodilla": "rodilla.es",
  "100 montaditos": "100montaditos.com",
  "repsol": "repsol.com",
  "cepsa": "cepsa.com",
  "galp": "galp.com",
  "bp": "bp.com",
  "shell": "shell.com",
  "renfe": "renfe.com",
  "uber": "uber.com",
  "cabify": "cabify.com",
  "bolt": "bolt.eu",
  "emt": "emtmadrid.es",
  "cruz verde": "cruzverde.es",
  "vodafone": "vodafone.es",
  "movistar": "movistar.es",
  "orange": "orange.es",
  "yoigo": "yoigo.com",
  "jazztel": "jazztel.com",
  "digi": "digimobil.es",
  "endesa": "endesa.com",
  "iberdrola": "iberdrola.es",
  "naturgy": "naturgy.es",
  "netflix": "netflix.com",
  "spotify": "spotify.com",
  "disney": "disneyplus.com",
  "hbo": "hbomax.com",
  "apple": "apple.com",
  "google": "google.com",
  "paypal": "paypal.com",
  "glovo": "glovoapp.com",
  "just eat": "justeat.es",
  "deliveroo": "deliveroo.es"
}

const MERCHANT_CATEGORY: Record<string, string> = {
  "mercadona.es": "Groceries",
  "carrefour.es": "Groceries",
  "lidl.es": "Groceries",
  "aldi.es": "Groceries",
  "dia.es": "Groceries",
  "alcampo.es": "Groceries",
  "consum.es": "Groceries",
  "eroski.es": "Groceries",
  "ahorramas.com": "Groceries",
  "supercor.es": "Groceries",
  "bonarea.cat": "Groceries",
  "hipercor.com": "Groceries",
  "zara.com": "Shopping",
  "bershka.com": "Shopping",
  "stradivarius.com": "Shopping",
  "pullandbear.com": "Shopping",
  "massimodutti.com": "Shopping",
  "oysho.com": "Shopping",
  "mango.com": "Shopping",
  "primark.com": "Shopping",
  "hm.com": "Shopping",
  "uniqlo.com": "Shopping",
  "decathlon.es": "Shopping",
  "nike.com": "Shopping",
  "adidas.es": "Shopping",
  "elcorteingles.es": "Shopping",
  "fnac.es": "Shopping",
  "mediamarkt.es": "Shopping",
  "worten.es": "Shopping",
  "action.com": "Shopping",
  "flyingtiger.com": "Shopping",
  "amazon.es": "Shopping",
  "ikea.com": "Home",
  "leroymerlin.es": "Home",
  "bricomart.es": "Home",
  "starbucks.com": "Coffee",
  "mcdonalds.es": "Restaurants",
  "burgerking.es": "Restaurants",
  "kfc.es": "Restaurants",
  "telepizza.es": "Restaurants",
  "dominos.es": "Restaurants",
  "goiko.com": "Restaurants",
  "vips.es": "Restaurants",
  "rodilla.es": "Restaurants",
  "100montaditos.com": "Restaurants",
  "glovoapp.com": "Restaurants",
  "justeat.es": "Restaurants",
  "deliveroo.es": "Restaurants",
  "repsol.com": "Transport",
  "cepsa.com": "Transport",
  "galp.com": "Transport",
  "bp.com": "Transport",
  "shell.com": "Transport",
  "renfe.com": "Transport",
  "uber.com": "Transport",
  "cabify.com": "Transport",
  "bolt.eu": "Transport",
  "emtmadrid.es": "Transport",
  "cruzverde.es": "Health",
  "vodafone.es": "Utilities",
  "movistar.es": "Utilities",
  "orange.es": "Utilities",
  "yoigo.com": "Utilities",
  "jazztel.com": "Utilities",
  "digimobil.es": "Utilities",
  "endesa.com": "Utilities",
  "iberdrola.es": "Utilities",
  "naturgy.es": "Utilities",
  "netflix.com": "Utilities",
  "spotify.com": "Utilities",
  "disneyplus.com": "Utilities",
  "hbomax.com": "Utilities"
}

// Categories that are almost always a shared household cost. Mirrors
// SHARED_LEANING_CATEGORIES in src/lib/categories.js.
const SHARED_LEANING = new Set(['Groceries', 'Rent', 'Utilities', 'Home'])

const norm = (s: string) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
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
