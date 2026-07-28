// Scheduled function (see netlify.toml — runs hourly) that sends a real Web
// Push "log today's spending" reminder to whoever set a reminder_hour that
// matches the current hour in Europe/Madrid. Needs SERVICE ROLE access to
// read every user's subscriptions/hour, so it uses SUPABASE_SERVICE_ROLE_KEY
// (a Netlify env var — never hardcode a service-role key in the repo).
import webpush from 'web-push'

const SB = 'https://bckxqcyyvhxlcfbyvgzl.supabase.co'
const VAPID_PUBLIC_KEY =
  'BOjhVO09UIP3_EDr5n5SknSAQzeuJna3V8HSgpDrih0XIEPC2Da34JZfyxILU3haxrATpIpDqwrYwjgIvuZEuLM'

const currentMadridHour = () =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: 'numeric', hour12: false }).format(new Date()))

export const handler = async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!serviceKey || !vapidPrivate) {
    return { statusCode: 500, body: 'Missing SUPABASE_SERVICE_ROLE_KEY or VAPID_PRIVATE_KEY env vars' }
  }
  webpush.setVapidDetails('mailto:orelpartuk1@gmail.com', VAPID_PUBLIC_KEY, vapidPrivate)

  const hour = currentMadridHour()
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }

  const dueRes = await fetch(
    `${SB}/rest/v1/user_private?select=owner&reminder_hour=eq.${hour}`,
    { headers }
  )
  const due = await dueRes.json()
  if (!Array.isArray(due) || due.length === 0) return { statusCode: 200, body: 'nothing due' }

  const owners = due.map((r) => r.owner)
  const subsRes = await fetch(
    `${SB}/rest/v1/push_subscriptions?select=*&owner=in.(${owners.join(',')})`,
    { headers }
  )
  const subs = await subsRes.json()

  const payload = JSON.stringify({ title: '💸 Duo Budget', body: 'Log today’s spending.', url: '/add' })
  let sent = 0
  for (const s of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
      sent++
    } catch (e) {
      // Gone/expired subscription — clean it up so we stop retrying it.
      if (e.statusCode === 404 || e.statusCode === 410) {
        await fetch(`${SB}/rest/v1/push_subscriptions?id=eq.${s.id}`, { method: 'DELETE', headers })
      }
    }
  }
  return { statusCode: 200, body: `sent ${sent}/${(subs || []).length}` }
}
