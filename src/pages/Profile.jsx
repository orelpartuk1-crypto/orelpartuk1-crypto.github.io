import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { t } from '../lib/i18n'
import TopBar from '../components/TopBar'
import { Screen, Item, Tap, Sheet } from '../components/motion'
import { Group, Row } from '../components/SettingsRows'

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
  const [editing, setEditing] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { setName(profile?.display_name || '') }, [profile?.display_name])

  const save = async () => {
    await updateDisplayName(name.trim() || 'Me')
    setEditing(false)
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

  const partner = members.find((m) => m.id !== user?.id)

  return (
    <div className="pb-28">
      <TopBar title={t('Profile')} back />
      <Screen className="mx-auto max-w-md px-4 space-y-5">
        {/* Identity up top, editable in place rather than behind a form: the
            name was a labelled text field plus its own Save button, which made
            the first thing on the screen look like a settings form instead of
            you. */}
        <Item className="card flex items-center gap-4">
          <Avatar name={name || profile?.display_name} size={64} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold">{name || profile?.display_name || t('You')}</p>
            <p className="truncate text-sm text-muted">{user?.email}</p>
            {saved && <p className="mt-0.5 text-xs font-medium text-brand-600">{t('Saved ✓')}</p>}
          </div>
          <Tap
            onClick={() => setEditing(true)}
            aria-label={t('Edit name')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-muted"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </Tap>
        </Item>

        <Group title={t('Household')} footer={t('Share this code so someone can join:')}>
          {members.map((m) => (
            <Row key={m.id}>
              <Avatar name={m.display_name} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{m.display_name}</span>
                <span className="block text-xs text-muted">{m.id === user?.id ? t('You') : t('Partner')}</span>
              </span>
            </Row>
          ))}
          <Row
            icon="🔑"
            label={household?.invite_code || '—'}
            sub={household?.name}
            onClick={copyCode}
            right={<span className="shrink-0 text-sm font-semibold text-brand-600">{copied ? t('Copied!') : t('Copy')}</span>}
          />
          {!partner && (
            <Row icon="👋" label={t('Nobody has joined yet')} sub={t('Send them the code above.')} />
          )}
        </Group>

        <Group title={t('Account')}>
          <Row icon="🔒" label={t('Change password')} onClick={() => setPwOpen(true)} />
          <Row icon="⚙️" label={t('Settings')} sub={t('Appearance, categories, reminders')} to="/settings" />
        </Group>

        <Item>
          <Tap className="btn-ghost w-full text-spend" onClick={signOut}>{t('Sign out')}</Tap>
        </Item>
      </Screen>

      <Sheet open={editing} onClose={() => setEditing(false)}>
        <div className="space-y-3">
          <h2 className="text-xl font-bold">{t('Your name')}</h2>
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('Your name')}
          />
          <Tap className="btn-primary w-full" onClick={save}>{t('Save')}</Tap>
        </div>
      </Sheet>

      <ChangePasswordSheet open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}

// Changing a password is a rare, focused job — a sheet, not a card that
// expands the profile list into a form in place.
function ChangePasswordSheet({ open, onClose }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(false)

  const submit = async () => {
    setErr(null)
    if (pw.length < 8) { setErr(t('Use at least 8 characters.')); return }
    if (pw !== pw2) { setErr(t("Those two don't match.")); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setPw(''); setPw2('')
    setDone(true)
    setTimeout(() => { setDone(false); onClose() }, 1200)
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="space-y-3">
        <h2 className="text-xl font-bold">{t('Change password')}</h2>
        <div>
          <label className="label">{t('New password')}</label>
          <input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <label className="label">{t('Again')}</label>
          <input className="field" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        </div>
        {err && <p className="text-sm text-spend">{err}</p>}
        {done && <p className="text-sm font-medium text-brand-600">{t('Password changed.')}</p>}
        <Tap className="btn-primary w-full" disabled={busy} onClick={submit}>
          {busy ? t('Saving…') : t('Change')}
        </Tap>
      </div>
    </Sheet>
  )
}
