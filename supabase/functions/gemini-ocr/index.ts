// Receipt scanning via Gemini's vision model — reads a photo directly and
// returns structured data (total, date, category, items), far more accurate
// than traditional OCR + regex parsing. Free tier: ~1500 requests/day.
// Client falls back to the old OCR.space/Tesseract path if this fails.
import { corsHeaders } from '../_shared/cors.ts'

const CATEGORIES = [
  'Groceries', 'Rent', 'Nights Out', 'Restaurants', 'Experiences', 'Transport',
  'Utilities', 'Health', 'Personal Care', 'Shopping', 'Travel', 'Coffee', 'Home', 'Other',
]

const SCHEMA = {
  type: 'object',
  properties: {
    amount: { type: 'number', description: 'The final total amount paid, in euros. Null if unreadable.', nullable: true },
    date: { type: 'string', description: 'Receipt date as YYYY-MM-DD. Null if not visible.', nullable: true },
    category: { type: 'string', enum: CATEGORIES },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Base product name in English, title case — no brand, variety or size' },
          price: { type: 'number', description: 'Price actually paid for this line, after any discount' },
          qty: { type: 'number', description: 'How many of this product, if the line says so. Default 1.', nullable: true },
        },
        required: ['name', 'price'],
      },
    },
  },
  required: ['category', 'items'],
}

// The prompt asks for one line per base product, but the model still slips
// sometimes — and collapsing duplicates is arithmetic, which belongs in code
// rather than in a language model's head. Same name (ignoring case and
// accents) becomes one line with the prices added up.
function mergeItems(raw: unknown) {
  if (!Array.isArray(raw)) return []
  const key = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
  const out: { name: string; price: number; qty: number }[] = []
  const seen = new Map<string, number>() // key -> index in out

  for (const it of raw) {
    const name = String(it?.name ?? '').trim()
    const price = Number(it?.price)
    if (!name || !Number.isFinite(price)) continue
    // A negative line means the model emitted a discount as its own item after
    // all. Take it off the product it names rather than dropping it, so the
    // items still add up to something close to the receipt.
    const qty = Number.isFinite(Number(it?.qty)) && Number(it?.qty) > 0 ? Math.round(Number(it.qty)) : 1
    const k = key(name)
    const at = seen.get(k)
    if (at == null) {
      if (price < 0) continue // nothing to subtract it from
      seen.set(k, out.length)
      out.push({ name, price, qty })
    } else {
      out[at].price = Math.round((out[at].price + price) * 100) / 100
      if (price >= 0) out[at].qty += qty
    }
  }
  return out.filter((i) => i.price > 0)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }
  try {
    const { image } = await req.json()
    if (!image) {
      return new Response(JSON.stringify({ error: 'no image' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Gemini not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // image is a data URL like "data:image/jpeg;base64,...."
    const match = String(image).match(/^data:(image\/\w+);base64,(.+)$/)
    if (!match) {
      return new Response(JSON.stringify({ error: 'bad image format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const [, mimeType, base64Data] = match

    const prompt = `You are reading a shop receipt (likely Spanish, from Madrid). Extract:
- amount: the FINAL total paid (look for "TOTAL", "TOTAL A PAGAR" — not subtotal, not IVA line alone).
- date: the receipt's date, as YYYY-MM-DD.
- category: pick the single best fit from the allowed list, based on the shop/items.
- items: the products bought. Skip barcodes, taxes, payment lines and totals. If the category isn't Groceries you may return an empty array.

Two rules matter more than literal transcription:

1. NAME THE PRODUCT, NOT THE PACKAGE. Write the name the way it would appear on
a shopping list: the base product in English, with no brand, no variety, no
flavour and no weight or volume. "Queso Gouda lonchas 200g" and "Mozzarella
120g" are both just "Cheese". "Leche Pascual desnatada 1L" is "Milk". "Coca-Cola
Zero 2L" is "Soft Drink". If the same base product appears on several lines,
return it ONCE with the prices added together and qty set to how many lines.

2. DISCOUNTS BELONG TO THEIR PRODUCT. A discount, offer or refund line ("DTO",
"descuento", "ahorro", "oferta", "3x2", a negative amount) is never its own
item. Subtract it from the product it applies to and return only the final
price. Oranges at 2.00 with a 0.20 discount underneath is one item: Oranges,
1.80. If a discount clearly applies to the whole basket rather than one
product, leave it out of items entirely — the total already reflects it.`

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: base64Data } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: SCHEMA,
          },
        }),
      }
    )

    if (!r.ok) {
      const t = await r.text()
      return new Response(JSON.stringify({ error: `Gemini error: ${t}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const j = await r.json()
    const text = j?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      return new Response(JSON.stringify({ error: 'empty response from Gemini' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const parsed = JSON.parse(text)

    return new Response(
      JSON.stringify({
        amount: parsed.amount ?? null,
        date: parsed.date ?? null,
        category: parsed.category || 'Other',
        items: mergeItems(parsed.items),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
