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
import { classify } from '../_shared/merchants.ts'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const q = Object.fromEntries(new URL(req.url).searchParams)
  const format = q.format === 'text' ? 'text' : 'html'

  // Shortcuts hands over whatever the card used — "12,34" in Spain, "12.34"
  // elsewhere, sometimes with the currency symbol attached. A refund arrives
  // negative; take the magnitude so it still logs as a real amount rather
  // than being rejected as invalid.
  const cleaned = String(q.amount || '').replace(/[^0-9.,-]/g, '').replace(',', '.')
  const amount = Math.abs(parseFloat(cleaned))

  if (!q.key) return respond('❌ Missing key', '❌ Missing key', format, 400)
  if (!(amount > 0)) return respond('❌ Enter a valid amount', '❌ Enter a valid amount', format, 400)

  const note = (q.note || '').trim()
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
