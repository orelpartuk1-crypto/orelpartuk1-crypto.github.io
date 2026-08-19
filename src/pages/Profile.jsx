import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'
import TopBar from '../components/TopBar'
import { Screen, Item, Tap } from '../components/motion'

// A name is enough to make an avatar: initials on a colour derived from the
// name itself, so everyone gets a distinct one without anyone uploading a file.
const AVATAR_COLORS = ['#0f7a3e', '#2563eb', '#db2777', '#d946ef', '#ca8a04', '#0891b2', '#7c3aed', '#d24a3c']

export function initialsOf(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

export function colorOf(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function Avatar({ name, size = 40, className = '' }) {
  const color = colorOf(name || '')
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  )
}

export default function Profile() {
  const { profile, household, members, user, updateDisplayName, signOut } = useAuth()
  const [name, setName] = useState(profile?.display_name || '')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setName(profile?.display_name || '') }, [profile?.display_name])

  const save = async () => {
    await updateDisplayName(name.trim() || 'Me')
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(household?.invite_code || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* the code is visible anyway */ }
  }

  return (
    <div className="pb-28">
      <TopBar title={t('Profile')} back />
      <Screen className="mx-auto max-w-md px-4 space-y-4">
        <Item className="card flex flex-col items-center gap-3 py-6">
          <Avatar name={name || profile?.display_name} size={84} />
          <div className="w-full">
            <label className="label">{t('Your name')}</label>
            <input className="field text-center" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Tap className="btn-primary w-full" onClick={save}>{saved ? t('Saved ✓') : t('Save')}</Tap>
          <p className="text-xs text-muted">{user?.email}</p>
        </Item>

        <Item className="card">
          <h2 className="label">{household?.name || t('Your household')}</h2>
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={m.display_name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{m.display_name}</span>
                  <span className="block text-xs text-muted">{m.id === user?.id ? t('You') : t('Partner')}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-sm text-muted">{t('Share this code so someone can join:')}</p>
          <Tap
            onClick={copyCode}
            className="mt-2 flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
          >
            <span className="text-2xl font-bold tracking-widest">{household?.invite_code}</span>
            <span className="font-medium text-brand-600">{copied ? t('Copied!') : t('Copy')}</span>
          </Tap>
        </Item>

        <Item><ChangePassword /></Item>

        <Item>
          <Link to="/settings" className="card-tap flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span className="text-2xl">⚙️</span>
              <span>
                <span className="block font-semibold">{t('Settings')}</span>
                <span className="block text-sm text-muted">{t('Appearance, categories, reminders')}</span>
              </span>
            </span>
            <span className="text-muted">›</span>
          </Link>
        </Item>

        <Item>
          <Tap className="btn-ghost w-full text-spend" onClick={signOut}>{t('Sign out')}</Tap>
        </Item>
      </Screen>
    </div>
  )
}

function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const submit = async () => {
    setErr(null); setMsg(null)
    if (pw.length < 8) { setErr(t('Use at least 8 characters.')); return }
    if (pw !== pw2) { setErr(t("Those two don't match.")); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setPw(''); setPw2(''); setOpen(false)
    setMsg(t('Password changed.'))
    setTimeout(() => setMsg(null), 3000)
  }

  if (!open) {
    return (
      <div className="card">
        <Tap className="flex w-full items-center justify-between" onClick={() => setOpen(true)}>
          <span className="flex items-center gap-3">
            <span className="text-2xl">🔑</span>
            <span className="text-left">
              <span className="block font-semibold">{t('Change password')}</span>
              <span className="block text-sm text-muted">{msg || t('For this account')}</span>
            </span>
          </span>
          <span className="text-muted">›</span>
        </Tap>
      </div>
    )
  }

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">{t('Change password')}</h2>
      <div>
        <label className="label">{t('New password')}</label>
        <input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
      </div>
      <div>
        <label className="label">{t('Again')}</label>
        <input className="field" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
      </div>
      {err && <p className="text-sm text-spend">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Tap className="btn-ghost py-3 text-base" onClick={() => { setOpen(false); setErr(null) }}>{t('Cancel')}</Tap>
        <Tap className="btn-primary py-3 text-base" disabled={busy} onClick={submit}>
          {busy ? t('Saving…') : t('Change')}
        </Tap>
      </div>
    </div>
  )
}
