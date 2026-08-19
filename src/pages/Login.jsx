import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { t } from '../lib/i18n'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email.trim(), password, name.trim() || 'Me')
        if (error) throw error
        setMsg({ type: 'ok', text: t('Account created! Check your email if confirmation is on, then sign in.') })
        setMode('signin')
      } else {
        const { error } = await signIn(email.trim(), password)
        if (error) throw error
      }
    } catch (err) {
      setMsg({ type: 'err', text: err.message || t('Something went wrong.') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/icon.svg" alt="" className="mx-auto h-20 w-20 rounded-3xl shadow-card" />
          <h1 className="mt-4 text-3xl font-bold">Duo Budget</h1>
          <p className="text-muted">{t('Track spending together, save apart.')}</p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="label">{t('Your name')}</label>
              <input
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('e.g. Alex')}
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label className="label">{t('Email')}</label>
            <input
              className="field"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">{t('Password')}</label>
            <input
              className="field"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {msg && (
            <p className={`text-sm ${msg.type === 'err' ? 'text-red-600' : 'text-green-600'}`}>
              {msg.text}
            </p>
          )}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? t('Please wait…') : mode === 'signup' ? t('Create account') : t('Sign in')}
          </button>
        </form>

        <button
          className="mt-4 w-full text-center text-brand-600 font-medium"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setMsg(null)
          }}
        >
          {mode === 'signin' ? t('New here? Create an account') : t('Already have an account? Sign in')}
        </button>
      </div>
    </div>
  )
}
