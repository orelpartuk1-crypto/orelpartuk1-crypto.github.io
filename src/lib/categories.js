// Expense categories, with an emoji + colour for the mobile UI.
// Colors validated as a set (fixed order matters — it's the adjacency the
// donut and legend actually show): lightness band, chroma floor, CVD
// separation (deutan/protan/tritan ≥8 ΔE OKLab), and normal-vision floor
// (≥15 ΔE) all pass. The two greys here used to both fail the chroma floor
// (read as the same washed-out non-color), and Personal Care sat 3.9 ΔE from
// Health — indistinguishable even with full-color vision, let alone for
// anyone colorblind. Re-run scripts/validate_palette.js from the dataviz
// skill before changing any of these.
export const CATEGORIES = [
  { key: 'Groceries', emoji: '🛒', color: '#16a34a' },
  { key: 'Rent', emoji: '🏠', color: '#2563eb' },
  { key: 'Nights Out', emoji: '🍸', color: '#db2777' },
  { key: 'Restaurants', emoji: '🍽️', color: '#f97316' },
  { key: 'Experiences', emoji: '🎟️', color: '#d946ef' },
  { key: 'Transport', emoji: '🚌', color: '#0891b2' },
  { key: 'Utilities', emoji: '💡', color: '#ca8a04' },
  { key: 'Health', emoji: '💊', color: '#dc2626' },
  { key: 'Personal Care', emoji: '🧴', color: '#0369a1' },
  { key: 'Shopping', emoji: '🛍️', color: '#7c3aed' },
  { key: 'Travel', emoji: '✈️', color: '#0d9488' },
  { key: 'Coffee', emoji: '☕', color: '#92400e' },
  { key: 'Home', emoji: '🛠️', color: '#4338ca' },
  { key: 'Other', emoji: '📦', color: '#9f1239' },
]

// Business-specific categories (shown only when logging a Business expense).
// Same validated-set rule as CATEGORIES above — Equipment and Office used to
// both fail the chroma floor, and Office/Other were the exact same hex.
export const BUSINESS_CATEGORIES = [
  { key: 'Meeting', emoji: '🤝', color: '#2563eb' },
  { key: 'Business Meal', emoji: '🍽️', color: '#f97316' },
  { key: 'Transport', emoji: '🚕', color: '#0891b2' },
  { key: 'Flight', emoji: '✈️', color: '#7c3aed' },
  { key: 'Hotel', emoji: '🏨', color: '#db2777' },
  { key: 'Work Tools', emoji: '🛠️', color: '#d946ef' },
  { key: 'Subscriptions', emoji: '🔁', color: '#65a30d' },
  { key: 'Marketing', emoji: '📣', color: '#4338ca' },
  { key: 'Equipment', emoji: '💻', color: '#0d9488' },
  { key: 'Office', emoji: '🏢', color: '#92400e' },
  { key: 'Fees', emoji: '🧾', color: '#ca8a04' },
  { key: 'Education', emoji: '🎓', color: '#9f1239' },
  { key: 'Other', emoji: '📦', color: '#16a34a' },
]

const ALL = [...CATEGORIES, ...BUSINESS_CATEGORIES]
export const categoryMeta = (key) =>
  ALL.find((c) => c.key === key) || { key, emoji: '📦', color: '#64748b' }

// One hue, ranked by size, rather than a color per category — this is what
// the reference Orel pointed at actually does: the biggest slice is the
// deepest green, the smallest fades toward the card's own background, and
// the shape of the split is the whole story. Uses the same brand/mint scale
// as every other themed color in the app, so it still re-tunes for dark
// mode instead of being six more hardcoded hex values.
const RANK_SHADES = [
  'rgb(var(--c-brand-700))',
  'rgb(var(--c-brand-500))',
  'rgb(var(--c-brand-200))',
  'rgb(var(--c-mint-300))',
  'rgb(var(--c-mint-200))',
  'rgb(var(--c-mint-100))',
]
export const shadeForRank = (i) => RANK_SHADES[Math.min(i, RANK_SHADES.length - 1)]

// Sensible default of Need vs Treat per category (user can always override).
const TREAT_CATEGORIES = new Set(['Nights Out', 'Restaurants', 'Experiences', 'Shopping', 'Travel', 'Coffee'])
export const defaultSpendType = (category) =>
  TREAT_CATEGORIES.has(category) ? 'treat' : 'need'

// Suggestions only for one-off bonus/income sources — free text is still allowed.
export const BONUS_SOURCES = [
  'Freelance', 'Second job', 'Work bonus', 'Business', 'Business – product',
  'Business – service', 'Client', 'Sale', 'Commission', 'Investment', 'Refund', 'Gift',
]

// Naive keyword guesser for the OCR flow — maps receipt text to a category.
const KEYWORDS = {
  Groceries: ['mercadona', 'carrefour', 'lidl', 'aldi', 'dia', 'supermercado', 'super', 'grocery', 'alcampo', 'consum', 'eroski'],
  Restaurants: ['restaurante', 'restaurant', 'bar ', 'cafe', 'cafeteria', 'menu', 'tapas', 'pizzeria', 'burger'],
  Coffee: ['starbucks', 'coffee', 'cafe ', 'espresso'],
  Transport: ['renfe', 'metro', 'taxi', 'cabify', 'uber', 'gasolina', 'repsol', 'cepsa', 'parking', 'bus'],
  Utilities: ['endesa', 'iberdrola', 'naturgy', 'agua', 'electricidad', 'gas', 'internet', 'movil', 'vodafone', 'movistar', 'orange'],
  Health: ['farmacia', 'pharmacy', 'clinica', 'dentista', 'medico'],
  Shopping: ['zara', 'primark', 'decathlon', 'ikea', 'amazon', 'el corte ingles', 'mango', 'h&m'],
  'Nights Out': ['pub', 'discoteca', 'club', 'cocktail', 'cerveza', 'copas'],
}

export function guessCategory(text = '') {
  const t = text.toLowerCase()
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    if (words.some((w) => t.includes(w))) return cat
  }
  return 'Other'
}

// Categories where the category IS the description — nobody needs to type
// "weekly shop" under Groceries. Everywhere else, a line called "Personal
// Care" tells you nothing three months later; a real description does.
// Shared by the Add screen and the scan review screen so the rule can't drift.
export const SELF_EXPLANATORY = new Set(['Groceries', 'Rent', 'Utilities', 'Taxes', 'Insurance', 'Subscriptions'])
