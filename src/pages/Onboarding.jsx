import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

// Shown after login when the user has no household yet.
export default function Onboarding() {
  const { createHousehold, joinHousehold, signOut, profile } = useAuth()
  const [tab, setTab] = useState('create')
  const [name, setName] = useState('Our Household')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const doCreate = async () => {
    setBusy(true); setErr(null)
    const { error } = await createHousehold(name.trim())
    if (error) setErr(error.message)
    setBusy(false)
  }
  const doJoin = async () => {
    setBusy(true); setErr(null)
    const { error } = await joinHousehold(code.trim())
    if (error) setErr(error.message)
    setBusy(false)
  }

  return (
    <div className="min-h-full flex flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-bold">Hi {profile?.display_name} 👋</h1>
        <p className="mt-1 text-muted">Set up your shared space to start tracking together.</p>

        <div className="mt-6 flex rounded-2xl bg-slate-100 p-1">
          <button
            className={`flex-1 rounded-xl py-2.5 font-semibold ${tab === 'create' ? 'bg-white shadow-sm' : 'text-muted'}`}
            onClick={() => setTab('create')}
          >
            Create
          </button>
          <button
            className={`flex-1 rounded-xl py-2.5 font-semibold ${tab === 'join' ? 'bg-white shadow-sm' : 'text-muted'}`}
            onClick={() => setTab('join')}
          >
            Join
          </button>
        </div>

        <div className="card mt-4 space-y-4">
          {tab === 'create' ? (
            <>
              <div>
                <label className="label">Household name</label>
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <button className="btn-primary w-full" disabled={busy} onClick={doCreate}>
                Create household
              </button>
              <p className="text-sm text-muted">
                You'll get an invite code to share with your partner so they can join.
              </p>
            </>
          ) : (
            <>
              <div>
                <label className="label">Invite code</label>
                <input
                  className="field uppercase tracking-widest"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                />
              </div>
              <button className="btn-primary w-full" disabled={busy} onClick={doJoin}>
                Join household
              </button>
            </>
          )}
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>

        <button className="mt-6 w-full text-center text-muted" onClick={signOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}
