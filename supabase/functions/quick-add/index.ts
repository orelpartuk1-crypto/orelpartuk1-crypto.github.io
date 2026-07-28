// GET endpoint for iOS Shortcuts: logs an expense from a simple URL.
//   .../functions/v1/quick-add?key=SECRET&amount=12&category=Groceries&scope=shared
// No JSON/headers needed in the shortcut — just "Open URL".
// Pass &format=text for a plain-text body — used by the Siri shortcut so
// "Show Notification" can display the real result instead of running silently.
// Ported from netlify/functions/quick-add.mjs (same logic, Deno runtime).
import { corsHeaders } from '../_shared/cors.ts'

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
  const amount = parseFloat(String(q.amount || '').replace(',', '.'))
  if (!q.key) return respond('❌ Missing key', '❌ Missing key', format, 400)
  if (!(amount > 0)) return respond('❌ Enter a valid amount', '❌ Enter a valid amount', format, 400)

  try {
    const r = await fetch(`${SB}/rest/v1/rpc/quick_log`, {
      method: 'POST',
      headers: { apikey: PUBKEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_key: q.key,
        p_amount: amount,
        p_category: q.category || 'Other',
        p_scope: q.scope || 'private',
        p_spend_type: q.spend_type || 'need',
        p_note: q.note || null,
      }),
    })
    if (!r.ok) {
      const t = (await r.text()).replace(/[<>]/g, '')
      return respond(`❌ Couldn't add.<br><small>${t}</small>`, `❌ Couldn't add: ${t}`, format, 400)
    }
    const cat = q.category || 'Other'
    const scope = q.scope || 'private'
    return respond(
      `✅ Added €${amount.toFixed(2)}<br><small style="color:#64748b">${cat} · ${scope}</small>`,
      `✅ Added €${amount.toFixed(2)} · ${cat} · ${scope}`,
      format
    )
  } catch (e) {
    const msg = String(e).replace(/[<>]/g, '')
    return respond(`❌ ${msg}`, `❌ ${msg}`, format, 500)
  }
})
