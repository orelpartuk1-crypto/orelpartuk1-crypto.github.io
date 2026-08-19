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

// Same day-of-month math as src/lib/upcoming.js, ported to Deno (UTC rather
// than local parts — a notification's due-soon window tolerates the 1-2 hour
// Madrid offset fine; an actual money calculation would not, but nothing
// here computes an amount, only "is this coming up").
function onDay(year: number, month: number, day: number) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)))
}
function nextOccurrence(dayOfMonth: number, from: Date) {
  const day = Math.min(Math.max(Number(dayOfMonth) || 1, 1), 31)
  const thisMonth = onDay(from.getUTCFullYear(), from.getUTCMonth(), day)
  const today = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  if (thisMonth < today) return onDay(from.getUTCFullYear(), from.getUTCMonth() + 1, day)
  return thisMonth
}
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000)
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

Deno.serve(async (_req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!serviceKey || !vapidPrivate) {
    return new Response('Missing SUPABASE_SERVICE_ROLE_KEY or VAPID_PRIVATE_KEY secrets', { status: 500 })
  }
  webpush.setVapidDetails('mailto:orelpartuk1@gmail.com', VAPID_PUBLIC_KEY, vapidPrivate)

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }
  const send = async (owner: string, subs: any[], payload: string) => {
    let ok = 0
    for (const s of subs.filter((x) => x.owner === owner)) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        ok++
      } catch (e: any) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await fetch(`${SB}/rest/v1/push_subscriptions?id=eq.${s.id}`, { method: 'DELETE', headers })
        }
      }
    }
    return ok
  }
  // Every subscription up front — both the daily nudge and the bill check
  // below need to know who can actually receive a push.
  const allSubsRes = await fetch(`${SB}/rest/v1/push_subscriptions?select=*`, { headers })
  const allSubs = (await allSubsRes.json()) || []
  if (!Array.isArray(allSubs) || allSubs.length === 0) return new Response('no subscribers')

  let sent = 0
  const summary: string[] = []

  // 1. The daily "log today's spending" nudge, at whatever hour each person
  // asked for.
  const hour = currentMadridHour()
  const dueRes = await fetch(`${SB}/rest/v1/user_private?select=owner&reminder_hour=eq.${hour}`, { headers })
  const due = (await dueRes.json()) || []
  const nudgePayload = JSON.stringify({ title: '💸 Duo Budget', body: 'Log today’s spending.', url: '/add' })
  for (const r of Array.isArray(due) ? due : []) sent += await send(r.owner, allSubs, nudgePayload)
  if (due.length) summary.push(`nudges:${due.length}`)

  // 2. Real "before you get charged" — an active recurring bill (or income)
  // landing within the next 2 days, pushed once per item per month. This is
  // the one the get-to-know screen's "Before you get charged" / "Coming
  // payments" lines actually promise; sending it for real is what makes that
  // promise true instead of describing a card that only shows up if you
  // happen to have the app open.
  const recRes = await fetch(
    `${SB}/rest/v1/recurring?select=id,owner,kind,name,amount,day_of_month&active=eq.true`,
    { headers }
  )
  const recurring = (await recRes.json()) || []
  const now = new Date()
  for (const r of Array.isArray(recurring) ? recurring : []) {
    if (!allSubs.some((s: any) => s.owner === r.owner)) continue
    const next = nextOccurrence(r.day_of_month, now)
    const days = daysBetween(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), next)
    if (days < 0 || days > 2) continue

    // Claims the (owner, key) slot atomically — the unique constraint is what
    // makes this safe against two overlapping runs both deciding to send.
    // Measured directly against this project rather than assumed: a fresh
    // insert returns 201; an insert that collides with the unique constraint
    // returns 409 (`Prefer: resolution=ignore-duplicates` did not change
    // that here — no `on_conflict` target was given, so Postgres raised the
    // constraint violation as normal). Either way the status code alone
    // tells us "new, go ahead" vs "already sent, skip", which is all this
    // needs.
    const key = `bill:${r.id}:${monthKey(next)}`
    const logRes = await fetch(`${SB}/rest/v1/notification_log`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ owner: r.owner, key }),
    })
    if (logRes.status !== 201) continue

    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
    const title = r.kind === 'income' ? `💰 ${r.name} lands ${when}` : `⏳ ${r.name} is due ${when}`
    const payload = JSON.stringify({ title, body: `€${Number(r.amount).toFixed(2)}`, url: '/plan' })
    sent += await send(r.owner, allSubs, payload)
    summary.push(`bill:${r.name}`)
  }

  return new Response(sent ? `sent ${sent} (${summary.join(', ')})` : 'nothing due')
})
