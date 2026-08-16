import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import TopBar from '../components/TopBar'
import { money } from '../lib/format'

const num = (s) => parseFloat((s || '0').replace(',', '.')) || 0

// Fixed salary only. Anything variable — bonuses, a freelance job, a one-off
// sale — is a transaction and belongs on the Add screen, so it lands in the
// month it actually arrived instead of inflating every month from here.
export default function Salary() {
  const { profile, updateMonthlyIncome } = useAuth()
  const [salary, setSalary] = useState(String(profile?.monthly_income ?? ''))
  const [saved, setSaved] = useState(false)

  useEffect(() => { setSalary(String(profile?.monthly_income ?? '')) }, [profile?.monthly_income])

  const save = async () => {
    await updateMonthlyIncome(num(salary))
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const current = Number(profile?.monthly_income ?? 0)

  return (
    <div className="pb-28">
      <TopBar title="Salary" subtitle="Your fixed monthly income" back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        <div className="card space-y-3">
          <h2 className="font-semibold text-lg">Monthly salary</h2>
          <p className="text-sm text-muted">
            What lands in your account every month, before anything extra. Change it here whenever it changes.
          </p>
          <div className="flex gap-2">
            <input
              className="field flex-1"
              inputMode="decimal"
              value={salary}
              onChange={(e) => setSalary(e.target.value.replace(/[^0-9.,]/g, ''))}
              placeholder="e.g. 2200"
            />
            <button className="btn-primary px-5" onClick={save}>
              {saved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
          {current > 0 && (
            <p className="text-sm text-muted">Currently counted as {money(current)} every month.</p>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold">Got something extra?</h2>
          <p className="mt-1 text-sm text-muted">
            A bonus, a freelance payment, a sale — those change month to month, so add them as income
            on the Add screen and they'll count only in the month they arrived.
          </p>
          <Link to="/add" className="btn-ghost mt-3 block w-full py-2.5 text-center text-base">
            Add income
          </Link>
        </div>
      </div>
    </div>
  )
}
