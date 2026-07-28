// Scheduled function (see supabase/schema_v15.sql — pg_cron calls this hourly)
// that sends a real Web Push "log today's spending" reminder to whoever set a
// reminder_hour that matches the current hour in Europe/Madrid.
// Ported from netlify/functions/send-reminders.mjs (Deno runtime).
//
// UNVERIFIED: web-push's Deno compatibility hasn't been confirmed on
// Supabase's Edge Runtime specifically (there's a documented history of
// AES-GCM issues under Deno for this library). Test with a real push before
// trusting it — check `supabase functions logs send-reminders` for crypto
// errors. If it fails, swap this import for `jsr:@negrel/webpush` (Deno-native
// VAPID) — but read its importVapidKeys() source first to confirm it accepts
// the EXISTING raw base64url key pair; do not run its keygen script, that
// would mint new VAPID keys and orphan every already-subscribed device.
import webpush from 'npm:web-push@3.6.7'

const SB = 'https://bckxqcyyvhxlcfbyvgzl.supabase.co'
const VAPID_PUBLIC_KEY =
  'BOjhVO09UIP3_EDr5n5SknSAQzeuJna3V8HSgpDrih0XIEPC2Da34JZfyxILU3haxrATpIpDqwrYwjgIvuZEuLM'

const currentMadridHour = () =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: 'numeric', hour12: false }).format(new Date()))

Deno.serve(async (_req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!serviceKey || !vapidPrivate) {
    return new Response('Missing SUPABASE_SERVICE_ROLE_KEY or VAPID_PRIVATE_KEY secrets', { status: 500 })
  }
  webpush.setVapidDetails('mailto:orelpartuk1@gmail.com', VAPID_PUBLIC_KEY, vapidPrivate)

  const hour = currentMadridHour()
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

  const dueRes = await fetch(`${SB}/rest/v1/user_private?select=owner&reminder_hour=eq.${hour}`, { headers })
  const due = await dueRes.json()
  if (!Array.isArray(due) || due.length === 0) return new Response('nothing due')

  const owners = due.map((r: { owner: string }) => r.owner)
  const subsRes = await fetch(`${SB}/rest/v1/push_subscriptions?select=*&owner=in.(${owners.join(',')})`, { headers })
  const subs = await subsRes.json()

  const payload = JSON.stringify({ title: '💸 Duo Budget', body: 'Log today’s spending.', url: '/add' })
  let sent = 0
  for (const s of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      sent++
    } catch (e: any) {
      // Gone/expired subscription — clean it up so we stop retrying it.
      if (e.statusCode === 404 || e.statusCode === 410) {
        await fetch(`${SB}/rest/v1/push_subscriptions?id=eq.${s.id}`, { method: 'DELETE', headers })
      }
    }
  }
  return new Response(`sent ${sent}/${(subs || []).length}`)
})
