import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/TopBar'

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
        <span className="shrink-0 text-sm font-medium text-brand-600">{copied ? 'Copied!' : 'Copy'}</span>
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
      <TopBar title="Log faster" subtitle="Home-screen icons, Siri & reminders" back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Home-screen icons */}
        <div className="card">
          <h2 className="font-semibold text-lg">📲 Home-screen shortcuts</h2>
          <p className="text-sm text-muted mt-0.5">
            The fastest way: put dedicated icons on your home screen that jump straight to Scan or Add.
          </p>
          <div className="mt-3 flex gap-2">
            <Link to="/scan" className="btn-primary flex-1 py-3 text-base">📸 Scan</Link>
            <Link to="/add" className="btn-ghost flex-1 py-3 text-base">➕ Quick add</Link>
          </div>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
            <li>Tap <b>📸 Scan</b> above (opens the scan screen).</li>
            <li>In Safari tap <b>Share</b> → <b>Add to Home Screen</b> → name it “Scan”.</li>
            <li>Repeat with <b>➕ Quick add</b> → name it “Add”.</li>
          </ol>
          <p className="mt-2 text-xs text-muted">
            Now “Scan” opens the camera in one tap, and “Add” opens the numpad. (First open, sign in once — it stays logged in.)
          </p>
        </div>

        {/* Daily reminder */}
        <div className="card">
          <h2 className="font-semibold text-lg">🔔 Daily reminder</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            <li>iPhone <b>Shortcuts</b> app → <b>Automation</b> → <b>＋</b> → <b>Create Personal Automation</b>.</li>
            <li><b>Time of Day</b> → e.g. 21:00, Daily.</li>
            <li>Action <b>Show Notification</b> → “💸 Log today's spending”.</li>
            <li>Turn off “Ask Before Running”.</li>
          </ol>
          <p className="mt-2 text-xs text-muted">
            Note: this is a plain iOS notification — tapping it opens Shortcuts, not Duo Budget (this isn't a native app,
            so iOS won't deep-link a tap into it). It's a nudge to open the app yourself, not a shortcut into it.
          </p>
        </div>

        {/* Siri quick-log — universal, asks amount + category + scope */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">🎙️ Siri: “Log expense” (asks everything)</h2>
          <p className="text-sm text-muted">
            One shortcut Siri can ask you about each time — how much, what for, shared or private:
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li><b>Shortcuts</b> app → <b>＋</b> → add <b>Ask for Input</b> (type <b>Number</b>, prompt “How much?”).</li>
            <li>Add <b>Ask for Input</b> again (type <b>Text</b>, prompt “What's it for?”) — say anything, e.g. “coffee”, “taxi”.</li>
            <li>Add <b>Choose from Menu</b>, prompt “Shared or private?”, menu items <b>Shared</b> / <b>Private</b>. In each branch add a <b>Text</b> action with just that word (<code>shared</code> / <code>private</code>) — this becomes the result after the menu.</li>
            <li>Add <b>URL Encode</b> → input: the category <b>Ask for Input</b> variable (so spaces/accents don't break the link).</li>
            <li>Add <b>Text</b> → build the link: paste the base link below, then insert variables in order — <b>Amount</b>, then the <b>encoded category</b>, then the <b>menu result</b> (scope). It should read like:<br />
              <code className="break-all">{universalBase}&amount=[Number]&category=[Encoded Text]&scope=[Menu Result]</code>
            </li>
            <li>Add <b>Get Contents of URL</b> → URL = that <b>Text</b>.</li>
            <li>Add <b>Show Notification</b> → text = <b>Contents of URL</b> (this shows “✅ Added” or the exact error — no more silent failures).</li>
            <li>Name it “Log expense”, turn off “Ask Before Running”. Say “Hey Siri, Log expense”.</li>
          </ol>
          <CopyRow label="Base link (build the full one above from this)" value={universalBase + '&amount=&category=&scope='} />
          <p className="text-xs text-muted">
            🔒 Keep this link private — it's your personal logging key. Need vs treat defaults to “need”; edit it in the app after if it was a treat.
          </p>
          <a href={testTextUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-600">
            Test it now (logs €1 “Test”, shows the real result) →
          </a>
        </div>

        {/* Simple fixed-category shortcuts, for one-word Siri phrases */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">⚡ Or: one-word shortcuts per category</h2>
          <p className="text-sm text-muted">
            Prefer speed over choice? Make a few of these instead — each only asks the amount:
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li><b>Ask for Input</b> (type: <b>Number</b>, prompt “Amount?”).</li>
            <li><b>Text</b> → paste the link below, then insert the <b>Provided Input</b> variable at the very end.</li>
            <li><b>Get Contents of URL</b> → URL = that Text.</li>
            <li>Name it e.g. “Log groceries”. Say “Hey Siri, Log groceries”.</li>
          </ol>
          <CopyRow label="Your quick-add link (amount goes at the end)" value={quickAddUrl} />
          <p className="text-xs text-muted">
            Change <code>category=Groceries</code> / <code>scope=shared</code> in the link to make different shortcuts
            (e.g. “Log coffee”, “Log night out”).
          </p>
        </div>
      </div>
    </div>
  )
}
