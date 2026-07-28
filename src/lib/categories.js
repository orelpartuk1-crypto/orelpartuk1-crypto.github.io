// Expense categories, with an emoji + colour for the mobile UI.
export const CATEGORIES = [
  { key: 'Groceries', emoji: '🛒', color: '#16a34a' },
  { key: 'Rent', emoji: '🏠', color: '#2563eb' },
  { key: 'Nights Out', emoji: '🍸', color: '#db2777' },
  { key: 'Restaurants', emoji: '🍽️', color: '#f97316' },
  { key: 'Experiences', emoji: '🎟️', color: '#d946ef' },
  { key: 'Transport', emoji: '🚌', color: '#0891b2' },
  { key: 'Utilities', emoji: '💡', color: '#ca8a04' },
  { key: 'Health', emoji: '💊', color: '#dc2626' },
  { key: 'Personal Care', emoji: '🧴', color: '#e11d48' },
  { key: 'Shopping', emoji: '🛍️', color: '#7c3aed' },
  { key: 'Travel', emoji: '✈️', color: '#0d9488' },
  { key: 'Coffee', emoji: '☕', color: '#92400e' },
  { key: 'Home', emoji: '🛠️', color: '#4b5563' },
  { key: 'Other', emoji: '📦', color: '#64748b' },
]

// Business-specific categories (shown only when logging a Business expense).
export const BUSINESS_CATEGORIES = [
  { key: 'Meeting', emoji: '🤝', color: '#2563eb' },
  { key: 'Business Meal', emoji: '🍽️', color: '#f97316' },
  { key: 'Transport', emoji: '🚕', color: '#0891b2' },
  { key: 'Flight', emoji: '✈️', color: '#0d9488' },
  { key: 'Hotel', emoji: '🏨', color: '#7c3aed' },
  { key: 'Work Tools', emoji: '🛠️', color: '#6366f1' },
  { key: 'Subscriptions', emoji: '🔁', color: '#0ea5e9' },
  { key: 'Marketing', emoji: '📣', color: '#db2777' },
  { key: 'Equipment', emoji: '💻', color: '#4b5563' },
  { key: 'Office', emoji: '🏢', color: '#64748b' },
  { key: 'Fees', emoji: '🧾', color: '#ca8a04' },
  { key: 'Education', emoji: '🎓', color: '#16a34a' },
  { key: 'Other', emoji: '📦', color: '#64748b' },
]

const ALL = [...CATEGORIES, ...BUSINESS_CATEGORIES]
export const categoryMeta = (key) =>
  ALL.find((c) => c.key === key) || { key, emoji: '📦', color: '#64748b' }

// Sensible default of Need vs Treat per category (user can always override).
const TREAT_CATEGORIES = new Set(['Nights Out', 'Restaurants', 'Experiences', 'Shopping', 'Travel', 'Coffee'])
export const defaultSpendType = (category) =>
  TREAT_CATEGORIES.has(category) ? 'treat' : 'need'

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
