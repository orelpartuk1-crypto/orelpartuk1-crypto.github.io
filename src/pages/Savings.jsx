import { useState } from 'react'
import { useSavings } from '../hooks/useSavings'
import Donut from '../components/Donut'
import Segmented from '../components/Segmented'
import TopBar from '../components/TopBar'
import { money, isoDay } from '../lib/format'

// `onClose`: present when opened as a sheet from Wealth rather than as its
// own route — swaps nav(-1) for actually closing the sheet, and drops the
// page's own bottom padding, which a sheet doesn't need.
export default function Savings({ onClose }) {
  const { goals, savedByGoal, loading, addGoal, deleteGoal, addContribution } = useSavings()
  const [showNew, setShowNew] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [scope, setScope] = useState('private')
  const [targetDate, setTargetDate] = useState('')
  const [kind, setKind] = useState('saving')

  const createGoal = async () => {
    const t = parseFloat((target || '').replace(',', '.'))
    if (!name.trim() || !(t > 0)) return
    await addGoal(name.trim(), t, scope, targetDate || null, kind)
    setName(''); setTarget(''); setScope('private'); setTargetDate(''); setKind('saving'); setShowNew(false)
  }

  return (
    <div className={onClose ? '' : 'pb-28'}>
      <TopBar
        title="Savings"
        subtitle="Private to you"
        back={!!onClose}
        onBack={onClose}
        right={
          <button
            onClick={() => setShowNew((s) => !s)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white shadow-fab active:scale-95"
            aria-label="New goal"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        }
      />

      <div className="mx-auto max-w-md px-4 space-y-4">
        {showNew && (
          <div className="card space-y-3">
            <h2 className="font-semibold text-lg">New savings goal</h2>
            <div>
              <label className="label">Goal name</label>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Trip to Italy" />
            </div>
            <div>
              <label className="label">Target (€)</label>
              <input className="field" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="500" />
            </div>
            <div>
              <label className="label">Target date (optional)</label>
              <input className="field" type="date" value={targetDate} min={isoDay(new Date())} onChange={(e) => setTargetDate(e.target.value)} />
              <p className="mt-1 text-xs text-muted">Set a date to see how much to save each month.</p>
            </div>
            <div>
              <label className="label">Type</label>
              <Segmented
                options={[
                  { value: 'saving', label: '🐷 Saving' },
                  { value: 'investment', label: '📈 Investment' },
                ]}
                value={kind}
                onChange={setKind}
              />
            </div>
            <div>
              <label className="label">Who's it for?</label>
              <Segmented
                options={[
                  { value: 'private', label: '🔒 Just me' },
                  { value: 'shared', label: '👫 Shared' },
                ]}
                value={scope}
                onChange={setScope}
              />
            </div>
            <button className="btn-primary w-full" onClick={createGoal}>Create goal</button>
          </div>
        )}

        {/* A goal-card-shaped placeholder, not a single line of text — the
            sheet this opens in sizes itself to its content, so "Loading…"
            snapping open to a stack of full goal cards a moment later read
            as the whole sheet jumping, not as data arriving. */}
        {loading && (
          <div className="space-y-4">
            <GoalCardSkeleton />
          </div>
        )}
        {!loading && goals.length === 0 && !showNew && (
          <div className="card py-10 text-center">
            <p className="text-4xl">🎯</p>
            <p className="mt-2 font-semibold">No goals yet</p>
            <p className="text-muted text-sm">Create one to start saving toward something.</p>
            <button className="btn-primary mt-4 inline-flex" onClick={() => setShowNew(true)}>New goal</button>
          </div>
        )}

        {goals.some((g) => (g.kind || 'saving') === 'saving') && (
          <div className="space-y-4">
            <h2 className="label px-1">🐷 Savings</h2>
            {goals.filter((g) => (g.kind || 'saving') === 'saving').map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                saved={savedByGoal[g.id] || 0}
                onContribute={(amt, note) => addContribution(g.id, amt, note)}
                onDelete={() => deleteGoal(g.id)}
              />
            ))}
          </div>
        )}

        {goals.some((g) => g.kind === 'investment') && (
          <div className="space-y-4">
            <h2 className="label px-1">📈 Investments</h2>
            {goals.filter((g) => g.kind === 'investment').map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                saved={savedByGoal[g.id] || 0}
                onContribute={(amt, note) => addContribution(g.id, amt, note)}
                onDelete={() => deleteGoal(g.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Months (rounded up) from today to an ISO date; null if no/invalid date.
function monthsUntil(iso) {
  if (!iso) return null
  const now = new Date()
  const d = new Date(iso + 'T00:00:00')
  const days = Math.ceil((d - now) / 86400000)
  if (days <= 0) return 0
  return Math.max(1, Math.round(days / 30.44))
}

function timeLeftLabel(months) {
  if (months == null) return null
  if (months === 0) return 'Target date reached'
  if (months < 1) return 'Less than a month left'
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} left`
  const y = Math.floor(months / 12)
  const m = months % 12
  return `${y} yr${y > 1 ? 's' : ''}${m ? ` ${m} mo` : ''} left`
}

function GoalCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <div className="h-[72px] w-[72px] shrink-0 animate-pulse rounded-full bg-slate-100" />
        <div className="min-w-0 flex-1 space-y-2 pt-2">
          <div className="h-4 w-2/5 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-3 h-11 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  )
}

function GoalCard({ goal, saved, onContribute, onDelete }) {
  const [amt, setAmt] = useState('')
  const target = Number(goal.target_amount)
  const ratio = target > 0 ? saved / target : 0
  const done = saved >= target

  const months = monthsUntil(goal.target_date)
  const remaining = Math.max(0, target - saved)
  const perMonth = months && months > 0 && !done ? remaining / months : null
  const overdue = months === 0 && !done

  const contribute = async () => {
    const v = parseFloat((amt || '').replace(',', '.'))
    if (!(v !== 0) || Number.isNaN(v)) return
    await onContribute(v, null)
    setAmt('')
  }

  const ringColor = done ? '#16a34a' : goal.kind === 'investment' ? '#0d9488' : '#2f6bff'

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <Donut
          size={72}
          stroke={8}
          data={[{ label: 'saved', value: saved, color: ringColor }]}
          total={target}
          center={<span className="text-sm font-bold">{Math.round(ratio * 100)}%</span>}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-lg font-semibold">{goal.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${goal.scope === 'shared' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-muted'}`}>
              {goal.scope === 'shared' ? '👫 Shared' : '🔒 Private'}
            </span>
          </div>
          <p className="text-sm text-muted">
            {money(saved)} of {money(target)} {done && '· reached! 🎉'}
          </p>
        </div>
        <button onClick={onDelete} className="shrink-0 text-slate-300 hover:text-red-500" aria-label="Delete goal">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
          </svg>
        </button>
      </div>

      {goal.target_date && !done && (
        <div className={`mt-2 flex items-center justify-between rounded-2xl p-2.5 text-sm ${overdue ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700'}`}>
          <span className="font-medium">
            {overdue ? '⏰ Past target date' : `📅 ${timeLeftLabel(months)}`}
          </span>
          {perMonth != null && (
            <span className="font-semibold">Save {money(perMonth)}/mo</span>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          className="field flex-1"
          inputMode="decimal"
          value={amt}
          onChange={(e) => setAmt(e.target.value.replace(/[^0-9.,-]/g, ''))}
          placeholder="Add contribution €"
        />
        <button className="btn-primary px-5" onClick={contribute}>Add</button>
      </div>
      <p className="mt-1.5 text-xs text-muted">Tip: use a negative number to record a withdrawal.</p>
    </div>
  )
}
