// Serverless proxy to OCR.space — keeps the API key off the client and avoids
// CORS. Receives a compressed data-URL image, returns the recognized text.
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
  try {
    const { image, language = 'spa' } = JSON.parse(event.body || '{}')
    if (!image) return { statusCode: 400, body: JSON.stringify({ error: 'no image' }) }

    const key = process.env.OCRSPACE_KEY || 'helloworld' // 'helloworld' = shared demo key (rate-limited)
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        error: errored ? (Array.isArray(j.ErrorMessage) ? j.ErrorMessage.join('; ') : j.ErrorMessage) : null,
      }),
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e) }) }
  }
}
