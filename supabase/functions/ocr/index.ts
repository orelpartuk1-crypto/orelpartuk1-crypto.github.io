// Serverless proxy to OCR.space — keeps the API key off the client and avoids
// CORS. Receives a compressed data-URL image, returns the recognized text.
// Ported from netlify/functions/ocr.mjs (same logic, Deno runtime).
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }
  try {
    const { image, language = 'spa' } = await req.json()
    if (!image) {
      return new Response(JSON.stringify({ error: 'no image' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const key = Deno.env.get('OCRSPACE_KEY') || 'helloworld' // shared demo key (rate-limited)
    const form = new URLSearchParams()
    form.set('base64Image', image) // data URL, e.g. "data:image/jpeg;base64,...."
    form.set('language', language)
    form.set('OCREngine', '2')
    form.set('isTable', 'true') // better structure for receipts
    form.set('scale', 'true')
    form.set('detectOrientation', 'true')

    const r = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    const j = await r.json()
    const text = j?.ParsedResults?.[0]?.ParsedText || ''
    const errored = j?.IsErroredOnProcessing

    return new Response(
      JSON.stringify({
        text,
        error: errored ? (Array.isArray(j.ErrorMessage) ? j.ErrorMessage.join('; ') : j.ErrorMessage) : null,
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
