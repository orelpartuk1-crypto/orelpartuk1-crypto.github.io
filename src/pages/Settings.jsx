import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { enablePush, disablePush, isPushEnabled, pushSupported } from '../lib/push'
import { getTheme, setTheme } from '../lib/theme'
import { CURRENCIES, getCurrency, setCurrency } from '../lib/format'
import { t, LANGUAGES, getLang, setLang } from '../lib/i18n'
import TopBar from '../components/TopBar'

export default function Settings() {
  const { profile, household, members, user, updateDisplayName, updateBudget, signOut, hasBusiness, setHasBusiness, reminderHour, updateReminderHour } = useAuth()

  const [copied, setCopied] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushErr, setPushErr] = useState(null)
  const [themeChoice, setThemeChoice] = useState(getTheme)
  const [currencyChoice] = useState(getCurrency)
  const [langChoice] = useState(getLang)

  useEffect(() => { isPushEnabled().then(setPushOn) }, [])

  const togglePush = async () => {
    setPushErr(null); setPushBusy(true)
    try {
      if (pushOn) {
        await disablePush()
        await updateReminderHour(null)
        setPushOn(false)
      } else {
        await enablePush(user.id)
        await updateReminderHour(reminderHour ?? 21)
        setPushOn(true)
      }
    } catch (e) {
      setPushErr(e.message || t('Something went wrong.'))
    }
    setPushBusy(false)
  }




  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(household?.invite_code || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked — code is visible anyway */ }
  }

  return (
    <div className="pb-28">
      <TopBar title={t('Settings')} back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Only things that change how the app behaves live here. Money itself —
            salary, rent, subscriptions, goals, dates — lives under Monthly, and
            every transaction goes through Add. */}

        <div className="card">
          <h2 className="label">{t('Appearance')}</h2>
          <div className="flex rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.06]">
            {[
              { v: 'light', l: t('☀️ Light') },
              { v: 'dark', l: t('🌙 Dark') },
              { v: 'system', l: t('📱 Auto') },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => { setTheme(o.v); setThemeChoice(o.v) }}
                className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-all duration-200 ${
                  themeChoice === o.v ? 'bg-white text-ink shadow-card' : 'text-muted'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{t('Auto follows your phone, including when it switches at sunset.')}</p>
        </div>

        <div className="card">
          <h2 className="label">{t('Language')}</h2>
          <div className="flex rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.06]">
            {Object.entries(LANGUAGES).map(([code, l]) => (
              <button
                key={code}
                type="button"
                onClick={() => { setLang(code); window.location.reload() }}
                className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-transform duration-100 active:scale-[0.96] ${
                  langChoice === code ? 'bg-white text-ink shadow-card' : 'text-muted'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {t('Your categories and anything you typed yourself stay as you wrote them.')}
          </p>
        </div>

        <div className="card">
          <h2 className="label">{t('Currency')}</h2>
          <div className="flex rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.06]">
            {Object.entries(CURRENCIES).map(([code, c]) => (
              <button
                key={code}
                type="button"
                onClick={() => { setCurrency(code); window.location.reload() }}
                className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-transform duration-100 active:scale-[0.96] ${
                  currencyChoice === code ? 'bg-white text-ink shadow-card' : 'text-muted'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {/* Said plainly rather than discovered later: this changes the
              symbol every figure is shown with, and nothing else. No rate is
              applied, so 20 stays 20 — real conversion would mean exchange
              rates and rewriting every amount ever saved. */}
          <p className="mt-2 text-xs text-muted">
            {t('Changes the symbol shown throughout the app. Amounts already saved keep their number — nothing is converted at an exchange rate.')}
          </p>
        </div>

        {/* Business mode — a real setting: it decides whether the Business zone
            and its categories exist at all. The tax screen itself lives inside
            that zone on the dashboard, not here. */}
        <button
          onClick={() => setHasBusiness(!hasBusiness)}
          className={`card flex w-full items-center justify-between text-left active:scale-[0.99] ${hasBusiness ? 'ring-2 ring-brand-500' : ''}`}
        >
          <span className="flex items-center gap-3">
            <span className="text-2xl">💼</span>
            <span>
              <span className="block font-semibold">{t('I own a business')}</span>
              <span className="block text-sm text-muted">{t('Adds a Business zone and its tax estimate')}</span>
            </span>
          </span>
          <span className={`flex h-7 w-12 shrink-0 items-center rounded-full px-0.5 transition ${hasBusiness ? 'bg-brand-500 justify-end' : 'bg-slate-200 justify-start'}`}>
            <span className="h-6 w-6 rounded-full bg-white shadow" />
          </span>
        </button>

        <Link to="/plan" className="card flex items-center justify-between active:scale-[0.99]">
          <span className="flex items-center gap-3">
            <span className="text-2xl">🔁</span>
            <span>
              <span className="block font-semibold">{t('Every month')}</span>
              <span className="block text-sm text-muted">{t('Rent, subscriptions and important dates')}</span>
            </span>
          </span>
          <span className="text-muted">›</span>
        </Link>

        <Link to="/categories" className="card flex items-center justify-between active:scale-[0.99]">
          <span className="flex items-center gap-3">
            <span className="text-2xl">🏷️</span>
            <span>
              <span className="block font-semibold">{t('Categories')}</span>
              <span className="block text-sm text-muted">{t('Rename, recolour, add subcategories')}</span>
            </span>
          </span>
          <span className="text-muted">›</span>
        </Link>

        <Link to="/automate" className="card flex items-center justify-between active:scale-[0.99]">
          <span className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <span>
              <span className="block font-semibold">{t('Log faster')}</span>
              <span className="block text-sm text-muted">{t('Apple Pay auto-log, Siri, home-screen icons')}</span>
            </span>
          </span>
          <span className="text-muted">›</span>
        </Link>

        {/* Daily push reminder */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">{t('🔔 Daily reminder')}</h2>
          {!pushSupported() ? (
            <p className="text-sm text-muted">
              {t('Not supported in this browser. On iPhone: add Duo Budget to your home screen first (Share → Add to Home Screen), then open it from there.')}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                {t('A real notification that opens the app when you tap it — unlike a Shortcuts alert.')}
              </p>
              <button
                onClick={togglePush}
                disabled={pushBusy}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 active:scale-[0.99] ${pushOn ? 'bg-brand-50' : 'bg-slate-50'}`}
              >
                <span className="font-medium">{pushOn ? t('Reminders on') : t('Turn on reminders')}</span>
                <span className={`flex h-7 w-12 items-center rounded-full px-0.5 transition ${pushOn ? 'bg-brand-500 justify-end' : 'bg-slate-200 justify-start'}`}>
                  <span className="h-6 w-6 rounded-full bg-white shadow" />
                </span>
              </button>
              {pushOn && (
                <div>
                  <label className="label">{t('Remind me at')}</label>
                  <select
                    className="field"
                    value={reminderHour ?? 21}
                    onChange={(e) => updateReminderHour(Number(e.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
              )}
              {pushErr && <p className="text-sm text-red-600">{pushErr}</p>}
            </>
          )}
        </div>

        {/* Household / invite */}
        <div className="card">
          <h2 className="font-semibold text-lg">{household?.name}</h2>
          <p className="text-sm text-muted mt-1">{t('Share this code so your partner can join:')}</p>
          <button
            onClick={copyCode}
            className="mt-2 flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 active:scale-[0.99]"
          >
            <span className="text-2xl font-bold tracking-widest">{household?.invite_code}</span>
            <span className="text-brand-600 font-medium">{copied ? t('Copied!') : t('Copy')}</span>
          </button>
          <div className="mt-3 flex flex-wrap gap-2">
            {members.map((m) => (
              <span key={m.id} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                {m.id === user?.id ? t('{name} (you)', { name: m.display_name }) : m.display_name}
              </span>
            ))}
          </div>
        </div>

        <Link to="/analytics" className="card flex items-center justify-between active:scale-[0.99]">
          <span className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <span>
              <span className="block font-semibold">{t('Category limits')}</span>
              <span className="block text-sm text-muted">{t('Now in Analytics, split into shared and personal')}</span>
            </span>
          </span>
          <span className="text-muted">›</span>
        </Link>

        <button className="btn-ghost w-full text-red-600" onClick={signOut}>{t('Sign out')}</button>
        <p className="text-center text-xs text-muted pb-2">Duo Budget · v0.1.0</p>
      </div>
    </div>
  )
}
