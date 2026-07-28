// GET endpoint for iOS Shortcuts: logs an expense from a simple URL.
//   /.netlify/functions/quick-add?key=SECRET&amount=12&category=Groceries&scope=shared
// No JSON/headers needed in the shortcut — just "Open URL", which is why it's
// far more reliable than a hand-built POST.
// Pass &format=text to get a plain-text body instead of an HTML page — used
// by the Siri shortcut so "Show Notification" can display the real result
// (success or error) instead of running silently with no feedback.
const SB = 'https://bckxqcyyvhxlcfbyvgzl.supabase.co'
const PUBKEY = 'sb_publishable_uns5CoujX97-YWiNEHifLw_cS6LhruN'

const respond = (msg, plain, format, code = 200) =>
  format === 'text'
    ? { statusCode: code, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: plain }
    : {
        statusCode: code,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="font-family:-apple-system,sans-serif;text-align:center;padding:48px 24px;font-size:26px;color:#0f172a">${msg}</body>`,
      }

export const handler = async (event) => {
  const q = event.queryStringParameters || {}
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
}
