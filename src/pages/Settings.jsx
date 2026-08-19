import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { enablePush, disablePush, isPushEnabled, pushSupported } from '../lib/push'
import { getTheme, setTheme } from '../lib/theme'
import { CURRENCIES, getCurrency, setCurrency } from '../lib/format'
import { t, LANGUAGES, getLang, setLang } from '../lib/i18n'
import TopBar from '../components/TopBar'
import { Sheet, Tap } from '../components/motion'
import { Group, Row, Toggle } from '../components/SettingsRows'

export default function Settings() {
  const { household, members, user, signOut, hasBusiness, setHasBusiness, reminderHour, updateReminderHour } = useAuth()

  const [copied, setCopied] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushErr, setPushErr] = useState(null)
  const [themeChoice, setThemeChoice] = useState(getTheme)
  const [currencyChoice] = useState(getCurrency)
  const [langChoice] = useState(getLang)
  // Language and currency are one-line facts, so they read as rows showing
  // their current value and open a short sheet to change — rather than each
  // permanently spending a card's worth of screen on a segmented control.
  const [sheet, setSheet] = useState(null) // 'lang' | 'currency' | null

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
      <div className="mx-auto max-w-md px-4 space-y-5">
        {/* Only things that change how the app behaves live here. Money itself —
            salary, rent, subscriptions, goals, dates — lives under Monthly, and
            every transaction goes through Add.

            "Category limits" used to sit here as a card whose only job was to
            say the feature had moved to Analytics. A settings screen is not
            the place to keep a signpost to somewhere else; it's gone. */}

        <Group title={t('Preferences')}>
          <Row icon="🗣" label={t('Language')} value={LANGUAGES[langChoice]?.label} onClick={() => setSheet('lang')} />
          <Row icon="💱" label={t('Currency')} value={CURRENCIES[currencyChoice]?.label} onClick={() => setSheet('currency')} />
          <Row icon="🏷️" label={t('Categories')} sub={t('Rename, recolour, add subcategories')} to="/categories" />
          <Row icon="🔁" label={t('Every month')} sub={t('Rent, subscriptions and important dates')} to="/plan" />
          <Row icon="⚡" label={t('Log faster')} sub={t('Apple Pay auto-log, Siri, home-screen icons')} to="/automate" />
          {/* Always reachable. The questionnaire is otherwise only offered in
              the alert bell, which can be dismissed or snoozed — and then
              there is no way back to it at all. */}
          <Row icon="👋" label={t('Tell me about your money')} sub={t('Set up your accounts, assets and monthly rhythm')} to="/intro" />
        </Group>

        <div>
          <h2 className="label px-1">{t('Appearance')}</h2>
          <div className="flex rounded-full bg-black/[0.04] p-1 dark:bg-white/[0.06]">
            {[
              { v: 'dark', l: t('🌙 Dark') },
              { v: 'system', l: t('📱 Auto') },
              { v: 'light', l: t('☀️ Light') },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => { setTheme(o.v); setThemeChoice(o.v) }}
                className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-transform duration-100 active:scale-[0.96] ${
                  themeChoice === o.v ? 'bg-white text-ink shadow-card' : 'text-muted'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <p className="mt-1.5 px-1 text-xs text-muted">{t('Auto follows your phone, including when it switches at sunset.')}</p>
        </div>

        <Group title={t('Notifications')} footer={pushErr || undefined}>
          {!pushSupported() ? (
            <Row icon="🔔" label={t('Daily reminder')} sub={t('Add Duo Budget to your home screen first, then open it from there.')} />
          ) : (
            <>
              <Row
                icon="🔔"
                label={pushOn ? t('Reminders on') : t('Daily reminder')}
                sub={t('Coming payments, weekly summary and nudges.')}
                onClick={pushBusy ? undefined : togglePush}
                right={<Toggle on={pushOn} />}
              />
              {pushOn && (
                <Row
                  icon="🕘"
                  label={t('Remind me at')}
                  right={
                    <select
                      className="bg-transparent text-right font-medium outline-none"
                      value={reminderHour ?? 21}
                      onChange={(e) => updateReminderHour(Number(e.target.value))}
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  }
                />
              )}
            </>
          )}
        </Group>

        <Group
          title={t('Household')}
          footer={t('Adding a business gives you a Business zone and its tax estimate.')}
        >
          <Row
            icon="💼"
            label={t('I own a business')}
            onClick={() => setHasBusiness(!hasBusiness)}
            right={<Toggle on={hasBusiness} />}
          />
          <Row
            icon="👋"
            label={household?.name || t('Household')}
            sub={t('Share this code so your partner can join:')}
            value={household?.invite_code}
            onClick={copyCode}
            right={<span className="shrink-0 text-sm font-semibold text-brand-600">{copied ? t('Copied!') : t('Copy')}</span>}
          />
          <Row
            icon="👫"
            label={t('Members')}
            value={members.map((m) => (m.id === user?.id ? t('{name} (you)', { name: m.display_name }) : m.display_name)).join(', ')}
          />
        </Group>

        <Tap className="btn-ghost w-full text-red-600" onClick={signOut}>{t('Sign out')}</Tap>
        <p className="text-center text-xs text-muted pb-2">Duo Budget · v0.1.0</p>
      </div>

      {/* Both pickers reload, so nothing is left rendering the old language or
          the previous currency symbol. */}
      <Sheet open={sheet === 'lang'} onClose={() => setSheet(null)}>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">{t('Language')}</h2>
          {Object.entries(LANGUAGES).map(([code, l]) => (
            <Tap
              key={code}
              onClick={() => { setLang(code); window.location.reload() }}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left ${langChoice === code ? 'bg-brand-50 font-semibold text-brand-700' : 'bg-slate-50'}`}
            >
              {l.label}
              {langChoice === code && <span>✓</span>}
            </Tap>
          ))}
          <p className="px-1 pt-1 text-xs text-muted">
            {t('Your categories and anything you typed yourself stay as you wrote them.')}
          </p>
        </div>
      </Sheet>

      <Sheet open={sheet === 'currency'} onClose={() => setSheet(null)}>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">{t('Currency')}</h2>
          {Object.entries(CURRENCIES).map(([code, c]) => (
            <Tap
              key={code}
              onClick={() => { setCurrency(code); window.location.reload() }}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left ${currencyChoice === code ? 'bg-brand-50 font-semibold text-brand-700' : 'bg-slate-50'}`}
            >
              {c.label}
              {currencyChoice === code && <span>✓</span>}
            </Tap>
          ))}
          {/* Said plainly rather than discovered later: this changes the symbol
              every figure is shown with, and nothing else. */}
          <p className="px-1 pt-1 text-xs text-muted">
            {t('Changes the symbol shown throughout the app. Amounts already saved keep their number — nothing is converted at an exchange rate.')}
          </p>
        </div>
      </Sheet>
    </div>
  )
}
