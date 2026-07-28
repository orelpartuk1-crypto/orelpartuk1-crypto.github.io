import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useExpenses } from '../hooks/useExpenses'
import { CATEGORIES } from '../lib/categories'
import { enablePush, disablePush, isPushEnabled, pushSupported } from '../lib/push'
import TopBar from '../components/TopBar'
import { money } from '../lib/format'

export default function Settings() {
  const { profile, household, members, user, updateDisplayName, updateBudget, signOut, hasBusiness, reminderHour, updateReminderHour } = useAuth()
  const { budgets, setCategoryBudget } = useExpenses()

  const [name, setName] = useState(profile?.display_name || '')
  const [budget, setBudget] = useState(String(household?.monthly_budget ?? ''))
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushErr, setPushErr] = useState(null)

  useEffect(() => { setName(profile?.display_name || '') }, [profile?.display_name])
  useEffect(() => { setBudget(String(household?.monthly_budget ?? '')) }, [household?.monthly_budget])
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
      setPushErr(e.message || 'Something went wrong.')
    }
    setPushBusy(false)
  }

  const budgetMap = Object.fromEntries(budgets.map((b) => [b.category, Number(b.monthly_limit)]))

  const saveProfile = async () => {
    await updateDisplayName(name.trim() || 'Me')
    await updateBudget(parseFloat((budget || '0').replace(',', '.')) || 0)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
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
      <TopBar title="Settings" back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        {/* Quick links */}
        <Link to="/money" className="card flex items-center justify-between active:scale-[0.99]">
          <span className="flex items-center gap-3">
            <span className="text-2xl">💶</span>
            <span>
              <span className="block font-semibold">Income & bills</span>
              <span className="block text-sm text-muted">Salary, bonuses, rent</span>
            </span>
          </span>
          <span className="text-muted">›</span>
        </Link>
        <Link to="/recurring" className="card flex items-center justify-between active:scale-[0.99]">
          <span className="flex items-center gap-3">
            <span className="text-2xl">🔁</span>
            <span>
              <span className="block font-semibold">Repeats monthly</span>
              <span className="block text-sm text-muted">Subscriptions & regular income</span>
            </span>
          </span>
          <span className="text-muted">›</span>
        </Link>
        <Link to="/automate" className="card flex items-center justify-between active:scale-[0.99]">
          <span className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <span>
              <span className="block font-semibold">Log faster</span>
              <span className="block text-sm text-muted">Siri, one-tap & reminders</span>
            </span>
          </span>
          <span className="text-muted">›</span>
        </Link>
        {hasBusiness && (
          <Link to="/tax" className="card flex items-center justify-between active:scale-[0.99]">
            <span className="flex items-center gap-3">
              <span className="text-2xl">💼</span>
              <span>
                <span className="block font-semibold">Business tax</span>
                <span className="block text-sm text-muted">Autónomo IRPF estimate (Madrid)</span>
              </span>
            </span>
            <span className="text-muted">›</span>
          </Link>
        )}
        <Link to="/dates" className="card flex items-center justify-between active:scale-[0.99]">
          <span className="flex items-center gap-3">
            <span className="text-2xl">🎂</span>
            <span>
              <span className="block font-semibold">Important dates</span>
              <span className="block text-sm text-muted">Birthdays, holidays + budgets</span>
            </span>
          </span>
          <span className="text-muted">›</span>
        </Link>

        {/* Profile + budget */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">Profile & budget</h2>
          <div>
            <label className="label">Your name</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Monthly budget (€)</label>
            <input
              className="field"
              inputMode="decimal"
              value={budget}
              onChange={(e) => setBudget(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="1500"
            />
          </div>
          <button className="btn-primary w-full" onClick={saveProfile}>
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>

        {/* Daily push reminder */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">🔔 Daily reminder</h2>
          {!pushSupported() ? (
            <p className="text-sm text-muted">
              Not supported in this browser. On iPhone: add Duo Budget to your home screen first (Share → Add to Home Screen), then open it from there.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                A real notification that opens the app when you tap it — unlike a Shortcuts alert.
              </p>
              <button
                onClick={togglePush}
                disabled={pushBusy}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 active:scale-[0.99] ${pushOn ? 'bg-brand-50' : 'bg-slate-50'}`}
              >
                <span className="font-medium">{pushOn ? 'Reminders on' : 'Turn on reminders'}</span>
                <span className={`flex h-7 w-12 items-center rounded-full px-0.5 transition ${pushOn ? 'bg-brand-500 justify-end' : 'bg-slate-200 justify-start'}`}>
                  <span className="h-6 w-6 rounded-full bg-white shadow" />
                </span>
              </button>
              {pushOn && (
                <div>
                  <label className="label">Remind me at</label>
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
          <p className="text-sm text-muted mt-1">Share this code so your partner can join:</p>
          <button
            onClick={copyCode}
            className="mt-2 flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 active:scale-[0.99]"
          >
            <span className="text-2xl font-bold tracking-widest">{household?.invite_code}</span>
            <span className="text-brand-600 font-medium">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <div className="mt-3 flex flex-wrap gap-2">
            {members.map((m) => (
              <span key={m.id} className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700">
                {m.id === user?.id ? `${m.display_name} (you)` : m.display_name}
              </span>
            ))}
          </div>
        </div>

        {/* Per-category budgets */}
        <div className="card">
          <h2 className="font-semibold text-lg">Category limits</h2>
          <p className="text-sm text-muted">Set a monthly cap per category (leave 0 for none).</p>
          <div className="mt-3 divide-y divide-slate-100">
            {CATEGORIES.map((c) => (
              <CategoryBudgetRow
                key={c.key}
                cat={c}
                value={budgetMap[c.key] || 0}
                onSave={(v) => setCategoryBudget(c.key, v)}
              />
            ))}
          </div>
        </div>

        <button className="btn-ghost w-full text-red-600" onClick={signOut}>Sign out</button>
        <p className="text-center text-xs text-muted pb-2">Duo Budget · v0.1.0</p>
      </div>
    </div>
  )
}

function CategoryBudgetRow({ cat, value, onSave }) {
  const [v, setV] = useState(value ? String(value) : '')
  useEffect(() => { setV(value ? String(value) : '') }, [value])

  const commit = () => {
    const num = parseFloat((v || '0').replace(',', '.')) || 0
    if (num !== value) onSave(num)
  }

  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-xl">{cat.emoji}</span>
      <span className="flex-1 font-medium">{cat.key}</span>
      <div className="flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-1.5">
        <span className="text-muted">€</span>
        <input
          className="w-16 bg-transparent text-right outline-none font-semibold"
          inputMode="decimal"
          value={v}
          onChange={(e) => setV(e.target.value.replace(/[^0-9.,]/g, ''))}
          onBlur={commit}
          placeholder="0"
        />
      </div>
    </div>
  )
}
