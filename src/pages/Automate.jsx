import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/TopBar'
import { t } from '../lib/i18n'

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
  }
  return (
    <div>
      <p className="label">{label}</p>
      <button onClick={copy} className="flex w-full items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-left active:scale-[0.99]">
        <code className="min-w-0 flex-1 truncate text-sm">{value}</code>
        <span className="shrink-0 text-sm font-medium text-brand-600">{copied ? t('Copied!') : t('Copy')}</span>
      </button>
    </div>
  )
}

export default function Automate() {
  const { quickKey } = useAuth()
  // Fixed Edge Function base — independent of whatever domain hosts the
  // frontend, so Shortcuts links don't break if the app's own URL changes.
  const base = 'https://bckxqcyyvhxlcfbyvgzl.supabase.co/functions/v1'
  const key = quickKey || 'YOUR-KEY'
  const quickAddUrl = `${base}/quick-add?key=${key}&category=Groceries&scope=shared&amount=`
  const universalBase = `${base}/quick-add?key=${key}&format=text`
  const testTextUrl = `${universalBase}&amount=1&category=Test&scope=private`

  return (
    <div className="pb-28">
      <TopBar title={t('Log faster')} subtitle={t('Home-screen icons, Siri & reminders')} back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Home-screen icons */}
        <div className="card">
          <h2 className="font-semibold text-lg">{t('📲 Home-screen shortcuts')}</h2>
          <p className="text-sm text-muted mt-0.5">
            {t('The fastest way: put dedicated icons on your home screen that jump straight to Scan or Add.')}
          </p>
          <div className="mt-3 flex gap-2">
            <Link to="/scan" className="btn-primary flex-1 py-3 text-base">{t('📸 Scan')}</Link>
            <Link to="/add" className="btn-ghost flex-1 py-3 text-base">{t('➕ Quick add')}</Link>
          </div>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            <li>{t('Tap')} <b>{t('📸 Scan')}</b> {t('above (opens the scan screen).')}</li>
            <li>{t('In Safari tap')} <b>{t('Share')}</b> → <b>{t('Add to Home Screen')}</b> → {t('name it “Scan”.')}</li>
            <li>{t('Repeat with')} <b>{t('➕ Quick add')}</b> → {t('name it “Add”.')}</li>
          </ol>
          <p className="mt-2 text-xs text-muted">
            {t('Now “Scan” opens the camera in one tap, and “Add” opens the numpad. (First open, sign in once — it stays logged in.)')}
          </p>
        </div>

        {/* Apple Pay tap-to-log — zero taps for amount + merchant */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">{t('💳 Auto-log every Apple Pay tap')}</h2>
          <p className="text-sm text-muted">
            {t('iOS has a built-in automation trigger that fires on every physical Apple Pay tap (NFC only — not online checkouts) and hands you the amount and merchant with no typing at all. Only the category defaults generically; fix it later from the')} <Link to="/expenses" className="text-brand-600 underline">{t('expenses list')}</Link> {t('if it matters.')}
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li><b>{t('Shortcuts')}</b> {t('app')} → <b>{t('Automation')}</b> → <b>＋</b> → <b>{t('Create Personal Automation')}</b> → {t('search')} <b>{t('Wallet')}</b> ({t('older iOS:')} <b>{t('Transaction')}</b>).</li>
            <li>{t('Select the card(s) to auto-log.')} <b>{t('Do this once per card if they should default to different scopes')}</b> {t('— e.g. a shared card → Shared, your own → Private.')}</li>
            <li>{t('Add')} <b>{t('URL Encode')}</b> → {t('input: tap the field, scroll to')} <b>{t('Shortcut Input')}</b>, {t('pick')} <b>{t('Merchant')}</b>.</li>
            <li>{t('Add')} <b>{t('Text')}</b> → {t('paste the base link below, then insert in order:')} <b>{t('Shortcut Input → Amount')}</b>, {t('then the category/scope for this card, then the')} <b>{t('encoded merchant')}</b> {t('as the note. It should read like:')}<br />
              <code className="break-all">{universalBase}&amount=[Shortcut Input → Amount]&category=Other&scope=shared&note=[Encoded Text]</code>
            </li>
            <li>{t('Add')} <b>{t('Get Contents of URL')}</b> → URL = {t('that')} <b>{t('Text')}</b>.</li>
            <li>{t('Add')} <b>{t('Show Notification')}</b> → {t('text =')} <b>{t('Contents of URL')}</b> {t('— confirms what was logged, or shows the error, without opening anything.')}</li>
            <li>{t('Turn off')} <b>{t('Ask Before Running')}</b> {t('and')} <b>{t('Notify When Run')}</b>. {t('Name it after the card, e.g. “Log — Joint card”.')}</li>
          </ol>
          <p className="text-xs text-muted">
            {t("Apple's own trigger occasionally times out on the first few taps while it settles — this is a known Shortcuts quirk, not a Duo Budget problem. If a tap doesn't log, add it manually; nothing is lost.")}
          </p>
        </div>

        {/* Daily reminder */}
        <div className="card">
          <h2 className="font-semibold text-lg">{t('🔔 Daily reminder')}</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            <li>{t('iPhone')} <b>{t('Shortcuts')}</b> {t('app')} → <b>{t('Automation')}</b> → <b>＋</b> → <b>{t('Create Personal Automation')}</b>.</li>
            <li><b>{t('Time of Day')}</b> → {t('e.g. 21:00, Daily.')}</li>
            <li>{t('Action')} <b>{t('Show Notification')}</b> → {t("“💸 Log today's spending”.")}</li>
            <li>{t('Turn off “Ask Before Running”.')}</li>
          </ol>
          <p className="mt-2 text-xs text-muted">
            {t("Note: this is a plain iOS notification — tapping it opens Shortcuts, not Duo Budget (this isn't a native app, so iOS won't deep-link a tap into it). It's a nudge to open the app yourself, not a shortcut into it.")}
          </p>
        </div>

        {/* Siri quick-log — universal, asks amount + category + scope */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">{t('🎙️ Siri: “Log expense” (asks everything)')}</h2>
          <p className="text-sm text-muted">
            {t('One shortcut Siri can ask you about each time — how much, what for, shared or private:')}
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li><b>{t('Shortcuts')}</b> {t('app')} → <b>＋</b> → {t('add')} <b>{t('Ask for Input')}</b> ({t('type')} <b>{t('Number')}</b>, {t('prompt “How much?”).')}</li>
            <li>{t('Add')} <b>{t('Ask for Input')}</b> {t('again')} ({t('type')} <b>{t('Text')}</b>, {t("prompt “What's it for?”) — say anything, e.g. “coffee”, “taxi”.")}</li>
            <li>{t('Add')} <b>{t('Choose from Menu')}</b>, {t('prompt “Shared or private?”, menu items')} <b>{t('Shared')}</b> / <b>{t('Private')}</b>. {t('In each branch add a')} <b>{t('Text')}</b> {t('action with just that word')} (<code>shared</code> / <code>private</code>) {t('— this becomes the result after the menu.')}</li>
            <li>{t('Add')} <b>{t('URL Encode')}</b> → {t('input: the category')} <b>{t('Ask for Input')}</b> {t("variable (so spaces/accents don't break the link).")}</li>
            <li>{t('Add')} <b>{t('Text')}</b> → {t('build the link: paste the base link below, then insert variables in order —')} <b>{t('Amount')}</b>, {t('then the')} <b>{t('encoded category')}</b>, {t('then the')} <b>{t('menu result')}</b> {t('(scope). It should read like:')}<br />
              <code className="break-all">{universalBase}&amount=[Number]&category=[Encoded Text]&scope=[Menu Result]</code>
            </li>
            <li>{t('Add')} <b>{t('Get Contents of URL')}</b> → URL = {t('that')} <b>{t('Text')}</b>.</li>
            <li>{t('Add')} <b>{t('Show Notification')}</b> → {t('text =')} <b>{t('Contents of URL')}</b> {t('(this shows “✅ Added” or the exact error — no more silent failures).')}</li>
            <li>{t('Name it “Log expense”, turn off “Ask Before Running”. Say “Hey Siri, Log expense”.')}</li>
          </ol>
          <CopyRow label={t('Base link (build the full one above from this)')} value={universalBase + '&amount=&category=&scope='} />
          <p className="text-xs text-muted">
            {t("🔒 Keep this link private — it's your personal logging key. Need vs treat defaults to “need”; edit it in the app after if it was a treat.")}
          </p>
          <a href={testTextUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-600">
            {t('Test it now (logs €1 “Test”, shows the real result) →')}
          </a>
        </div>

        {/* Simple fixed-category shortcuts, for one-word Siri phrases */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">{t('⚡ Or: one-word shortcuts per category')}</h2>
          <p className="text-sm text-muted">
            {t('Prefer speed over choice? Make a few of these instead — each only asks the amount:')}
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li><b>{t('Ask for Input')}</b> ({t('type:')} <b>{t('Number')}</b>, {t('prompt “Amount?”).')}</li>
            <li><b>{t('Text')}</b> → {t('paste the link below, then insert the')} <b>{t('Provided Input')}</b> {t('variable at the very end.')}</li>
            <li><b>{t('Get Contents of URL')}</b> → URL = {t('that Text.')}</li>
            <li>{t('Name it e.g. “Log groceries”. Say “Hey Siri, Log groceries”.')}</li>
          </ol>
          <CopyRow label={t('Your quick-add link (amount goes at the end)')} value={quickAddUrl} />
          <p className="text-xs text-muted">
            {t('link|Change')} <code>category=Groceries</code> / <code>scope=shared</code> {t('in the link to make different shortcuts (e.g. “Log coffee”, “Log night out”).')}
          </p>
        </div>
      </div>
    </div>
  )
}
