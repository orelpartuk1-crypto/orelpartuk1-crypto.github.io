// Merchant name (as a receipt prints it) -> the domain a logo service knows
// it by. Receipts rarely print a domain, so this is the bridge between what
// the scan reads and what a logo lookup can answer.
//
// Deliberately weighted to Spain, since that's where the receipts come from.
// Only names listed here get a logo — see the note in merchantDomain() for
// why guessing is worse than not trying. Everything else falls back to a
// lettered badge, which is a normal outcome here, not an error.
const KNOWN = {
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
  hipercor: 'hipercor.es',
  ahorramas: 'ahorramas.com',
  supercor: 'supercor.es',
  bonarea: 'bonarea.com',

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

// A stable colour per merchant, so the fallback badge for a given shop is
// always the same one and starts to read as recognisable in its own right.
const BADGE_COLORS = ['#0f7a3e', '#2563eb', '#db2777', '#f97316', '#7c3aed', '#0891b2', '#ca8a04', '#dc2626']
export function merchantColor(raw) {
  const t = norm(raw)
  let h = 0
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0
  return BADGE_COLORS[h % BADGE_COLORS.length]
}
