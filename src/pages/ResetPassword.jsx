import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

// Shown automatically after opening a "reset password" email link — Supabase
// detects the recovery token in the URL and fires a PASSWORD_RECOVERY event
// (see AuthContext), which routes here regardless of what page you'd land on.
export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      setMsg({ type: 'err', text: 'Password must be at least 6 characters.' })
      return
    }
    if (password !== confirm) {
      setMsg({ type: 'err', text: "Passwords don't match." })
      return
    }
    setBusy(true)
    setMsg(null)
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) setMsg({ type: 'err', text: error.message || 'Something went wrong.' })
  }

  return (
    <div className="min-h-full flex flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/icon.svg" alt="" className="mx-auto h-20 w-20 rounded-3xl shadow-card" />
          <h1 className="mt-4 text-3xl font-bold">Set a new password</h1>
          <p className="text-muted">Choose a new password for your account.</p>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="label">New password</label>
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {msg && <p className="text-sm text-red-600">{msg.text}</p>}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>
    </div>
  )
}
