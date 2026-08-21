// GET endpoint for iOS Shortcuts: logs an expense from a simple URL.
//
//   .../functions/v1/quick-add?key=SECRET&amount=12.34&note=MERCADONA
//
// Built for the Apple Pay automation: a Wallet payment fires a Shortcuts
// automation that calls this with the amount and the merchant name, and the
// expense lands with no app open and nothing to tap. Category and scope are
// worked out from the merchant using the app's own merchant list (generated
// into _shared/merchants.ts, so the phone and this function can't disagree
// about what "Mercadona" is) — an explicit &category= / &scope= still wins,
// which is what the older Siri shortcut sends.
//
// &format=text returns a plain-text body instead of HTML — that's what the
// automation shows in its confirmation notification.
import { corsHeaders } from '../_shared/cors.ts'
import { classify, cleanMerchant } from '../_shared/merchants.ts'

const SB = 'https://bckxqcyyvhxlcfbyvgzl.supabase.co'
const PUBKEY = 'sb_publishable_uns5CoujX97-YWiNEHifLw_cS6LhruN'

const respond = (msg: string, plain: string, format: string, code = 200) =>
  format === 'text'
    ? new Response(plain, { status: code, headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' } })
    : new Response(
        `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="font-family:-apple-system,sans-serif;text-align:center;padding:48px 24px;font-size:26px;color:#0f172a">${msg}</body>`,
        { status: code, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } }
      )

// Values can arrive as query params (the original Siri shortcut) or in a POST
// body (the Apple Pay automation). The body matters: a merchant like
// "Lidl, Madrid, Madrid" has spaces and commas, and putting that straight
// into a URL produces something Shortcuts refuses to send at all — a form
// body is encoded by Shortcuts itself, so the problem disappears.
async function readParams(req: Request): Promise<Record<string, string>> {
  const q = Object.fromEntries(new URL(req.url).searchParams)
  if (req.method !== 'POST') return q
  try {
    const type = req.headers.get('content-type') || ''
    if (type.includes('json')) return { ...q, ...(await req.json()) }
    const form = await req.formData()
    return { ...q, ...Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])) }
  } catch {
    return q
  }
}

const asAmount = (v: unknown) => {
  const n = Math.abs(parseFloat(String(v ?? '').replace(/[^0-9.,-]/g, '').replace(',', '.')))
  return Number.isFinite(n) && n > 0 ? n : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const q = await readParams(req)
  const format = q.format === 'text' ? 'text' : 'html'

  // Shortcuts hands over whatever the card used — "12,34" in Spain, "12.34"
  // elsewhere, sometimes with the currency symbol attached. A refund arrives
  // negative; take the magnitude so it still logs as a real amount rather
  // than being rejected as invalid.
  // Shortcuts' Wallet trigger hands over a Transaction object, and how it
  // stringifies is not something the docs pin down — so rather than guess a
  // format and silently log wrong numbers, `debug=1` echoes exactly what
  // arrived and writes nothing. One real payment tells us the shape, and the
  // parser below is written against that instead of against an assumption.
  if (q.debug === '1') {
    const dump = JSON.stringify(q, null, 1).slice(0, 900)
    return respond(`<pre style="text-align:left;font-size:13px">${dump.replace(/[<>]/g, '')}</pre>`, dump, format)
  }

  // Which of the Wallet transaction's two exposed fields carries the amount
  // is genuinely undocumented, and the first real payment showed the one we
  // expected to be numeric arriving as "Lidl". So rather than depend on
  // getting that right in the Shortcuts UI: whichever value actually parses
  // as a number IS the amount, and the other is the merchant. Being tolerant
  // here removes a whole class of "set it up slightly wrong and every
  // expense is garbage" failure, at no cost.
  let amount = asAmount(q.amount)
  let note = (q.note || '').trim()
  if (amount == null && asAmount(note) != null) {
    amount = asAmount(note)
    note = (q.amount || '').trim()
  }
  // Strip the town/region the card appends, so the expense reads "Lidl"
  // rather than "Lidl, Madrid, Madrid".
  note = cleanMerchant(note)

  if (!q.key) return respond('❌ Missing key', '❌ Missing key', format, 400)
  if (amount == null) return respond('❌ Enter a valid amount', '❌ Enter a valid amount', format, 400)
  // An explicit category/scope (the older Siri shortcut) always wins; the
  // merchant guess only fills in what wasn't specified.
  const guess = note ? classify(note) : { category: 'Other', scope: 'private' as const }
  const category = q.category || guess.category
  const scope = q.scope || guess.scope

  try {
    const r = await fetch(`${SB}/rest/v1/rpc/quick_log`, {
      method: 'POST',
      headers: { apikey: PUBKEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_key: q.key,
        p_amount: amount,
        p_category: category,
        p_scope: scope,
        p_spend_type: q.spend_type || 'need',
        p_note: note || null,
      }),
    })
    if (!r.ok) {
      const t = (await r.text()).replace(/[<>]/g, '')
      return respond(`❌ Couldn't add.<br><small>${t}</small>`, `❌ Couldn't add: ${t}`, format, 400)
    }
    // The merchant is the useful half of the confirmation — "€12.34
    // Mercadona" tells you it caught the right purchase; "€12.34 Groceries"
    // could be any shop.
    const label = note ? `${note} · ${category}` : `${category} · ${scope}`
    return respond(
      `✅ Added €${amount.toFixed(2)}<br><small style="color:#64748b">${label}</small>`,
      `✅ €${amount.toFixed(2)} · ${label}`,
      format
    )
  } catch (e) {
    const msg = String(e).replace(/[<>]/g, '')
    return respond(`❌ ${msg}`, `❌ ${msg}`, format, 500)
  }
})
