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
          name: { type: 'string', description: 'Product name, translated to English, title case' },
          price: { type: 'number' },
        },
        required: ['name', 'price'],
      },
    },
  },
  required: ['category', 'items'],
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
- items: every distinct product line with its price in euros, name translated to English. Skip barcodes, taxes, payment method lines, and totals — only real products. If the category isn't Groceries, you may return an empty items array.`

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
        items: Array.isArray(parsed.items) ? parsed.items : [],
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
