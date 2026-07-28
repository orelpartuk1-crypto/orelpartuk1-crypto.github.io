import Tesseract from 'tesseract.js'
import { guessCategory } from './categories'

// Match money like "12,34", "1.234,56", "12.34", optionally with a € sign.
const AMOUNT_RE = /(?:€\s*)?(\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})(?:\s*€)?/g

// Spanish/European number -> float. "1.234,56" -> 1234.56 ; "12,34" -> 12.34
function parseNumber(raw) {
  let s = raw.replace(/[€\s]/g, '')
  if (s.includes(',') && s.includes('.')) {
    // Whichever comes last is the decimal separator.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (s.includes(',')) {
    s = s.replace(',', '.')
  }
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

const TOTAL_HINTS = ['total a pagar', 'total', 'importe', 'a pagar', 'to pay', 'amount due', 'suma']

// Match dates like 12/07/2026, 12-07-26, 12.07.2026 (day-first, European).
const DATE_RE = /\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/

// Pull a plausible receipt date -> ISO 'YYYY-MM-DD', or null.
export function parseDate(text) {
  const m = text.match(DATE_RE)
  if (!m) return null
  let [, d, mo, y] = m
  d = parseInt(d, 10); mo = parseInt(mo, 10); y = parseInt(y, 10)
  if (y < 100) y += 2000
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null
  const dt = new Date(y, mo - 1, d)
  // Reject impossible or clearly-future dates (allow a day of clock skew).
  if (dt.getMonth() !== mo - 1 || dt.getTime() > Date.now() + 86400000) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// --- Spanish -> English product translation (common groceries + basics) -----
const WORD_ES_EN = {
  pan: 'Bread', barra: 'Bread', baguette: 'Baguette', integral: 'Wholemeal', bolleria: 'Pastry',
  croissant: 'Croissant', tostada: 'Toast', leche: 'Milk', huevos: 'Eggs', huevo: 'Egg',
  queso: 'Cheese', mantequilla: 'Butter', yogur: 'Yogurt', yogures: 'Yogurt', nata: 'Cream',
  tomate: 'Tomato', tomates: 'Tomatoes', cherry: 'Cherry', platano: 'Banana', platanos: 'Bananas',
  manzana: 'Apple', manzanas: 'Apples', naranja: 'Orange', naranjas: 'Oranges', limon: 'Lemon',
  fresa: 'Strawberry', fresas: 'Strawberries', uva: 'Grapes', uvas: 'Grapes', patata: 'Potato',
  patatas: 'Potatoes', cebolla: 'Onion', cebollas: 'Onions', ajo: 'Garlic', zanahoria: 'Carrot',
  lechuga: 'Lettuce', pepino: 'Cucumber', pimiento: 'Pepper', calabacin: 'Courgette',
  champinones: 'Mushrooms', aguacate: 'Avocado', fruta: 'Fruit', verdura: 'Vegetables',
  pollo: 'Chicken', pechuga: 'Chicken breast', carne: 'Meat', ternera: 'Beef', cerdo: 'Pork',
  picada: 'Minced meat', picana: 'Steak', solomillo: 'Sirloin', filete: 'Steak', bacon: 'Bacon',
  jamon: 'Ham', serrano: 'Serrano', chorizo: 'Chorizo', salchichas: 'Sausages', salmon: 'Salmon',
  atun: 'Tuna', gambas: 'Prawns', bacalao: 'Cod', pescado: 'Fish', arroz: 'Rice', pasta: 'Pasta',
  espaguetis: 'Spaghetti', harina: 'Flour', azucar: 'Sugar', sal: 'Salt', aceite: 'Oil',
  oliva: 'Olive', vinagre: 'Vinegar', garbanzos: 'Chickpeas', lentejas: 'Lentils',
  aceitunas: 'Olives', cereales: 'Cereal', avena: 'Oats', miel: 'Honey', mermelada: 'Jam',
  cafe: 'Coffee', cacao: 'Cocoa', galletas: 'Biscuits', chocolate: 'Chocolate', frutos: 'Nuts',
  agua: 'Water', zumo: 'Juice', refresco: 'Soft drink', cerveza: 'Beer', vino: 'Wine',
  papel: 'Paper', higienico: 'Toilet', servilletas: 'Napkins', detergente: 'Detergent',
  lavavajillas: 'Dish soap', champu: 'Shampoo', gel: 'Shower gel', jabon: 'Soap',
  desodorante: 'Deodorant', camiseta: 'T-shirt', pantalon: 'Trousers', vestido: 'Dress',
  zapatos: 'Shoes', calcetines: 'Socks', chaqueta: 'Jacket', jersey: 'Sweater',
}
const PHRASE_ES_EN = {
  'barra campera': 'Bread', 'tomate cherry': 'Cherry tomatoes', 'pechuga de pollo': 'Chicken breast',
  'patatas fritas': 'Crisps', 'papel higienico': 'Toilet paper', 'aceite de oliva': 'Olive oil',
  'agua mineral': 'Water', 'carne picada': 'Minced meat',
}
const _strip = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const _title = (s) => s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

export function translateItem(name) {
  const key = _strip(name).replace(/\s+/g, ' ').trim()
  if (PHRASE_ES_EN[key]) return PHRASE_ES_EN[key]
  const words = key.split(' ')
  const mapped = words.map((w) => (w in WORD_ES_EN ? WORD_ES_EN[w] : null))
  if (mapped.some((w) => w !== null)) {
    const t = mapped.map((w, i) => (w == null ? words[i] : w)).filter(Boolean).join(' ').trim()
    if (t) return _title(t)
  }
  return _title(name)
}

// Extract individual line items (product + price) from a receipt.
const ITEM_PRICE = /(\d{1,3}(?:[.\s]\d{3})*,\d{2})\s*€?\s*[A-Z*]?\s*$/
const ITEM_STOP = /(lidl|mercadona|carrefour|alcampo|eroski|\bdia\b|supermercado|s\.a\b|c\.i\.f|nif|calle|avda|avenida|\bmadrid\b|\bbarcelona\b|tel\.?|www\.|\beur\b|iva|total|entrega|subtotal|tarjeta|mastercard|visa|debit|credit|efectivo|cambio|contactless|factura|ticket|recibo|gracias|cliente|importe|\bsuma\b|redondeo|descuento)/i

export function parseItems(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  let end = lines.findIndex((l) => /^(total|suma|importe|a pagar)\b/i.test(l))
  if (end === -1) end = lines.length
  const items = []
  for (const line of lines.slice(0, end)) {
    if (ITEM_STOP.test(line)) continue
    if (/kg\s*x|eur\s*\/\s*kg|ud\s*x/i.test(line)) continue // weight/qty detail line
    const m = line.match(ITEM_PRICE)
    if (!m) continue
    const price = parseNumber(m[1])
    if (price == null || price <= 0 || price > 10000) continue
    let name = line.slice(0, m.index).replace(/[.\-–·*_=]+$/, '').replace(/\s{2,}/g, ' ').trim()
    // Pull out a quantity like "2 x 1,09" (2 units at 1,09) -> qty 2, clean name.
    let qty = 1
    const qm = name.match(/^(.*?)\s+(\d+)\s*[xX]\s*\d+[.,]\d{2}$/)
    if (qm) { name = qm[1].trim(); qty = parseInt(qm[2], 10) || 1 }
    name = name
      .replace(/^\d+\s*[xX]\s*/, '')                 // leading "2 x"
      .replace(/\s+\d+\s*[xX]$/, '')                 // trailing "2 x"
      .replace(/\b\d+\s*(uds?|u|kg|g|l|ml)\b/gi, '') // stray units
      .trim()
    if (name.length < 2 || /^\d+$/.test(name)) continue
    const tname = translateItem(name)
    items.push({ name: qty > 1 ? `${qty}× ${tname}` : tname, price })
  }
  return items
}

// From raw OCR text, pick the most likely receipt total.
export function parseReceipt(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  let best = null // { amount, score }
  const consider = (amount, score) => {
    if (amount == null || amount <= 0 || amount > 100000) return
    if (!best || score > best.score || (score === best.score && amount > best.amount)) {
      best = { amount, score }
    }
  }

  for (const line of lines) {
    const low = line.toLowerCase()
    const hinted = TOTAL_HINTS.some((h) => low.includes(h))
    // "total" but not "subtotal" gets top priority.
    const strong = hinted && !low.includes('subtotal')
    let m
    AMOUNT_RE.lastIndex = 0
    while ((m = AMOUNT_RE.exec(line))) {
      const amount = parseNumber(m[1])
      const score = strong ? 3 : hinted ? 2 : 1
      consider(amount, score)
    }
  }

  return {
    amount: best?.amount ?? null,
    category: guessCategory(text),
    date: parseDate(text),
    items: parseItems(text),
    rawText: text,
  }
}

// Run Tesseract on an image File/Blob/dataURL. onProgress(0..1) optional.
export async function scanReceipt(image, onProgress) {
  const { data } = await Tesseract.recognize(image, 'spa+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress)
    },
  })
  return parseReceipt(data.text || '')
}
