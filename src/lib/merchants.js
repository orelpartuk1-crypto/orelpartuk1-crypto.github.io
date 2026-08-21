// Merchant name (as a receipt prints it) -> the domain a logo service knows
// it by. Receipts rarely print a domain, so this is the bridge between what
// the scan reads and what a logo lookup can answer.
//
// Deliberately weighted to Spain, since that's where the receipts come from.
// Only names listed here get a logo — see the note in merchantDomain() for
// why guessing is worse than not trying. Everything else falls back to a
// lettered badge, which is a normal outcome here, not an error.
export const KNOWN = {
  // Supermarkets & groceries
  mercadona: 'mercadona.es',
  carrefour: 'carrefour.es',
  lidl: 'lidl.es',
  aldi: 'aldi.es',
  dia: 'dia.es',
  alcampo: 'alcampo.es',
  consum: 'consum.es',
  eroski: 'eroski.es',
  'el corte ingles': 'elcorteingles.es',
  hipercor: 'hipercor.com',
  ahorramas: 'ahorramas.com',
  supercor: 'supercor.es',
  bonarea: 'bonarea.cat',

  // Clothing & department
  zara: 'zara.com',
  bershka: 'bershka.com',
  stradivarius: 'stradivarius.com',
  pullandbear: 'pullandbear.com',
  'pull and bear': 'pullandbear.com',
  massimo: 'massimodutti.com',
  'massimo dutti': 'massimodutti.com',
  oysho: 'oysho.com',
  mango: 'mango.com',
  primark: 'primark.com',
  'h&m': 'hm.com',
  hm: 'hm.com',
  uniqlo: 'uniqlo.com',
  decathlon: 'decathlon.es',
  nike: 'nike.com',
  adidas: 'adidas.es',

  // Home & general
  ikea: 'ikea.com',
  leroy: 'leroymerlin.es',
  'leroy merlin': 'leroymerlin.es',
  bricomart: 'bricomart.es',
  amazon: 'amazon.es',
  fnac: 'fnac.es',
  mediamarkt: 'mediamarkt.es',
  worten: 'worten.es',
  action: 'action.com',
  tiger: 'flyingtiger.com',

  // Food & drink
  starbucks: 'starbucks.com',
  mcdonalds: 'mcdonalds.es',
  "mcdonald's": 'mcdonalds.es',
  burgerking: 'burgerking.es',
  'burger king': 'burgerking.es',
  kfc: 'kfc.es',
  telepizza: 'telepizza.es',
  dominos: 'dominos.es',
  "domino's": 'dominos.es',
  goiko: 'goiko.com',
  vips: 'vips.es',
  rodilla: 'rodilla.es',
  '100 montaditos': '100montaditos.com',

  // Transport & fuel
  repsol: 'repsol.com',
  cepsa: 'cepsa.com',
  galp: 'galp.com',
  bp: 'bp.com',
  shell: 'shell.com',
  renfe: 'renfe.com',
  uber: 'uber.com',
  cabify: 'cabify.com',
  bolt: 'bolt.eu',
  emt: 'emtmadrid.es',

  // Pharmacy, health & telecom
  'cruz verde': 'cruzverde.es',
  vodafone: 'vodafone.es',
  movistar: 'movistar.es',
  orange: 'orange.es',
  yoigo: 'yoigo.com',
  jazztel: 'jazztel.com',
  digi: 'digimobil.es',

  // Utilities & services
  endesa: 'endesa.com',
  iberdrola: 'iberdrola.es',
  naturgy: 'naturgy.es',
  netflix: 'netflix.com',
  spotify: 'spotify.com',
  disney: 'disneyplus.com',
  hbo: 'hbomax.com',
  apple: 'apple.com',
  google: 'google.com',
  paypal: 'paypal.com',
  glovo: 'glovoapp.com',
  'just eat': 'justeat.es',
  deliveroo: 'deliveroo.es',
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export function merchantDomain(raw) {
  const t = norm(raw)
  if (!t) return null

  // Longest known key that appears anywhere in the line wins, so
  // "ZARA ESPAÑA S.A. - MADRID" still resolves to zara.com.
  const hit = Object.keys(KNOWN)
    .filter((k) => t.includes(k))
    .sort((a, b) => b.length - a.length)[0]
  if (hit) return KNOWN[hit]

  // Deliberately no guessing beyond this point. Building a domain out of the
  // first word looks clever and is actively wrong: "Farmacia Ruiz" becomes
  // farmacia.com and "Bar Paco" becomes bar.com — both real domains owned by
  // companies with nothing to do with the shop, so the local pharmacy would
  // show a stranger's logo. A lettered badge is honest; a confident wrong
  // logo is not. Unknown shops get the badge, and the fix for a chain that
  // deserves better is one line in KNOWN above.
  return null
}

// Which category a brand almost always means. Typing "Lidl" should not also
// require telling the app it was groceries — the brand already says so. Only
// listed where it's genuinely unambiguous: a supermarket is Groceries, Zara
// is Shopping. Anything debatable is left out rather than guessed.
export const MERCHANT_CATEGORY = {
  'mercadona.es': 'Groceries', 'carrefour.es': 'Groceries', 'lidl.es': 'Groceries',
  'aldi.es': 'Groceries', 'dia.es': 'Groceries', 'alcampo.es': 'Groceries',
  'consum.es': 'Groceries', 'eroski.es': 'Groceries', 'ahorramas.com': 'Groceries',
  'supercor.es': 'Groceries', 'bonarea.cat': 'Groceries', 'hipercor.com': 'Groceries',

  'zara.com': 'Shopping', 'bershka.com': 'Shopping', 'stradivarius.com': 'Shopping',
  'pullandbear.com': 'Shopping', 'massimodutti.com': 'Shopping', 'oysho.com': 'Shopping',
  'mango.com': 'Shopping', 'primark.com': 'Shopping', 'hm.com': 'Shopping',
  'uniqlo.com': 'Shopping', 'decathlon.es': 'Shopping', 'nike.com': 'Shopping',
  'adidas.es': 'Shopping', 'elcorteingles.es': 'Shopping', 'fnac.es': 'Shopping',
  'mediamarkt.es': 'Shopping', 'worten.es': 'Shopping', 'action.com': 'Shopping',
  'flyingtiger.com': 'Shopping', 'amazon.es': 'Shopping',

  'ikea.com': 'Home', 'leroymerlin.es': 'Home', 'bricomart.es': 'Home',

  'starbucks.com': 'Coffee',
  'mcdonalds.es': 'Restaurants', 'burgerking.es': 'Restaurants', 'kfc.es': 'Restaurants',
  'telepizza.es': 'Restaurants', 'dominos.es': 'Restaurants', 'goiko.com': 'Restaurants',
  'vips.es': 'Restaurants', 'rodilla.es': 'Restaurants', '100montaditos.com': 'Restaurants',
  'glovoapp.com': 'Restaurants', 'justeat.es': 'Restaurants', 'deliveroo.es': 'Restaurants',

  'repsol.com': 'Transport', 'cepsa.com': 'Transport', 'galp.com': 'Transport',
  'bp.com': 'Transport', 'shell.com': 'Transport', 'renfe.com': 'Transport',
  'uber.com': 'Transport', 'cabify.com': 'Transport', 'bolt.eu': 'Transport',
  'emtmadrid.es': 'Transport',

  'cruzverde.es': 'Health',

  'vodafone.es': 'Utilities', 'movistar.es': 'Utilities', 'orange.es': 'Utilities',
  'yoigo.com': 'Utilities', 'jazztel.com': 'Utilities', 'digimobil.es': 'Utilities',
  'endesa.com': 'Utilities', 'iberdrola.es': 'Utilities', 'naturgy.es': 'Utilities',
  'netflix.com': 'Utilities', 'spotify.com': 'Utilities', 'disneyplus.com': 'Utilities',
  'hbomax.com': 'Utilities',
}

// Card networks append the town and region to the shop name — a real Lidl
// payment arrives as "Lidl, Madrid, Madrid". Only the first segment is the
// shop; everything after the first comma is location noise that makes the
// expense list unreadable.
//
// Deliberately just the first comma, not anything cleverer: a shop name is
// what a card prints before the address, and trying to detect "which parts
// are place names" would eventually eat a legitimate name like
// "Ben & Jerry's, Madrid". Casing is left exactly as it came — uppercasing
// rules break real names ("H&M" would become "H&m").
export function cleanMerchant(raw) {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.split(',')[0].trim() || s
}

// The category a brand name implies, or null when the brand is unknown or
// its category would be a guess.
export function merchantCategory(raw) {
  const d = merchantDomain(raw)
  return d ? MERCHANT_CATEGORY[d] || null : null
}

// Phone/telecom providers — the one merchant type genuinely universal enough
// to nudge toward Business scope for anyone who has a business enabled,
// since a phone line doing double duty for work is close to the default
// case. Deliberately narrow rather than "everything tax-deductible": that's
// a much broader, personal judgment (is THIS grocery run for an office
// snack, or dinner?) that a fixed keyword list would get wrong at least as
// often as right, and a wrong scope guess costs real money if missed.
// Expand this set later if a specific merchant proves as unambiguous.
const BUSINESS_LEANING_DOMAINS = new Set(['vodafone.es', 'movistar.es', 'orange.es', 'yoigo.com', 'jazztel.com', 'digimobil.es'])
export function merchantLeansBusiness(raw) {
  const d = merchantDomain(raw)
  return !!d && BUSINESS_LEANING_DOMAINS.has(d)
}

// A stable colour per merchant, so the fallback badge for a given shop is
// always the same one and starts to read as recognisable in its own right.
const BADGE_COLORS = ['#0f7a3e', '#2563eb', '#db2777', '#f97316', '#7c3aed', '#0891b2', '#ca8a04', '#dc2626']
export function merchantColor(raw) {
  const t = norm(raw)
  let h = 0
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0
  return BADGE_COLORS[h % BADGE_COLORS.length]
}
