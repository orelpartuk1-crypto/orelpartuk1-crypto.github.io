import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useAccounts } from '../hooks/useAccounts'
import { useAllExpenses } from '../hooks/useAllExpenses'
import { supabase } from '../lib/supabase'
import { parseCSV, guessColumns, toCandidates, markDuplicates } from '../lib/bankImport'
import { CATEGORIES } from '../lib/categories'
import TopBar from '../components/TopBar'
import Segmented from '../components/Segmented'
import { money, dayLabel } from '../lib/format'
import { t } from '../lib/i18n'

export default function ImportBank() {
  const nav = useNavigate()
  const { user, household } = useAuth()
  const { active: accounts, defaultAccount } = useAccounts()
  const { expenses: existing, reload } = useAllExpenses()
  const fileRef = useRef(null)

  const [stage, setStage] = useState('pick') // pick | map | review | done
  const [parsed, setParsed] = useState({ headers: [], rows: [] })
  const [mapping, setMapping] = useState({ date: null, description: null, amount: null })
  const [accountId, setAccountId] = useState(null)
  const [scope, setScope] = useState('private')
  const [category, setCategory] = useState('Other')
  const [chosen, setChosen] = useState({}) // index -> boolean
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [imported, setImported] = useState(0)

  const onPick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(null)
    try {
      const text = await file.text()
      const p = parseCSV(text)
      if (!p.rows.length) { setErr(t("Couldn't find any rows in that file.")); return }
      setParsed(p)
      setMapping(guessColumns(p.headers))
      setAccountId(defaultAccount?.id || null)
      setStage('map')
    } catch {
      setErr(t("Couldn't read that file. Export it as CSV from your bank and try again."))
    }
  }

  const candidates = useMemo(() => {
    if (!mapping.date || !mapping.amount) return []
    return markDuplicates(toCandidates(parsed.rows, mapping), existing)
  }, [parsed.rows, mapping, existing])

  const fresh = candidates.filter((c) => !c.duplicateOf)
  const dupes = candidates.filter((c) => c.duplicateOf)

  const goReview = () => {
    // Anything that looks like it's already in the app starts unticked. The
    // whole point is not to double what a scan or Apple Pay already logged.
    setChosen(Object.fromEntries(candidates.map((c, i) => [i, !c.duplicateOf])))
    setStage('review')
  }

  const selectedCount = Object.values(chosen).filter(Boolean).length
  const selectedTotal = candidates.reduce((t, c, i) => (chosen[i] ? t + c.amount : t), 0)

  const runImport = async () => {
    setBusy(true); setErr(null)
    const rows = candidates
      .filter((_, i) => chosen[i])
      .map((c) => ({
        household_id: household.id,
        paid_by: user.id,
        account_id: accountId,
        amount: c.amount,
        category,
        scope,
        spend_type: 'need',
        kind: scope === 'private' ? 'personal' : 'shared',
        note: c.description.slice(0, 120),
        spent_at: c.date,
      }))

    if (!rows.length) { setBusy(false); setStage('done'); return }

    // In chunks, so one oversized statement doesn't hit a request limit and
    // leave the import half-applied with no way to tell what landed.
    let done = 0
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase.from('expenses').insert(rows.slice(i, i + 100))
      if (error) { setErr(`${error.message} — ${t('{done} of {total} imported.', { done, total: rows.length })}`); break }
      done += Math.min(100, rows.length - i)
    }
    setImported(done)
    await reload()
    setBusy(false)
    setStage('done')
  }

  return (
    <div className="pb-28">
      <TopBar title={t('Import statement')} subtitle={t('CSV from your bank')} back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        {err && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}

        {stage === 'pick' && (
          <>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={onPick} />
            <button
              onClick={() => fileRef.current?.click()}
              className="card flex w-full flex-col items-center gap-3 border-2 border-dashed border-slate-200 py-14 active:scale-[0.99]"
            >
              <span className="text-4xl">📄</span>
              <span className="text-lg font-semibold">{t('Choose a CSV file')}</span>
              <span className="text-sm text-muted">{t('Semicolons or commas, Spanish or English formats')}</span>
            </button>
            <div className="card text-sm text-muted">
              <p className="font-semibold text-ink">{t('Getting the file from Santander')}</p>
              <p className="mt-1">
                {t("Online banking → your account → movements → export. Pick CSV rather than Excel or PDF; Excel files aren't readable here.")}
              </p>
              <p className="mt-2">
                {t('Money coming in is ignored on purpose — salary and transfers are already handled properly elsewhere, and importing them as spending would distort every total.')}
              </p>
            </div>
          </>
        )}

        {stage === 'map' && (
          <>
            <div className="card space-y-3">
              <h2 className="font-semibold">{t('Which column is which?')}</h2>
              <p className="text-sm text-muted">
                {t("Found {n} rows. Check these look right — change any that don't.", { n: parsed.rows.length })}
              </p>
              {['date', 'description', 'amount'].map((field) => (
                <div key={field}>
                  <label className="label">{t(`column|${field}`)}</label>
                  <select
                    className="field"
                    value={mapping[field] || ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value || null }))}
                  >
                    <option value="">{t('— none —')}</option>
                    {parsed.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="card space-y-3">
              <div>
                <label className="label">{t('Import into')}</label>
                <select className="field" value={accountId || ''} onChange={(e) => setAccountId(e.target.value)}>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t('Treat as')}</label>
                <Segmented
                  options={[{ value: 'private', label: t('👤 Private') }, { value: 'shared', label: t('🤝 Shared') }]}
                  value={scope}
                  onChange={setScope}
                />
              </div>
              <div>
                <label className="label">{t('Category for all of them')}</label>
                <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.key}</option>)}
                </select>
                <p className="mt-1 text-xs text-muted">
                  {t('One category for the batch — sort them properly afterwards from the expenses list.')}
                </p>
              </div>
            </div>

            <button
              className="btn-primary w-full"
              disabled={!mapping.date || !mapping.amount || !accountId || candidates.length === 0}
              onClick={goReview}
            >
              {candidates.length === 1 ? t('Preview 1 payment') : t('Preview {n} payments', { n: candidates.length })}
            </button>
            {candidates.length === 0 && (
              <p className="text-center text-sm text-muted">
                {t('No spending found with those columns — check the date and amount pickers.')}
              </p>
            )}
          </>
        )}

        {stage === 'review' && (
          <>
            <div className="card">
              <div className="flex items-baseline justify-between">
                <span className="label mb-0">{t('Selected')}</span>
                <span className="tnum font-bold">{selectedCount} · {money(selectedTotal)}</span>
              </div>
              {dupes.length > 0 && (
                <p className="mt-2 rounded-2xl bg-amber-50 p-2.5 text-sm text-amber-800">
                  {dupes.length === 1
                    ? t("1 payment looks like one you already logged, so it's unticked. Tick one only if it's genuinely separate.")
                    : t("{n} payments look like ones you already logged, so they're unticked. Tick one only if it's genuinely separate.", { n: dupes.length })}
                </p>
              )}
            </div>

            <div className="card">
              <ul className="divide-y divide-slate-100">
                {candidates.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 py-2.5">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0"
                      checked={!!chosen[i]}
                      onChange={(e) => setChosen((s) => ({ ...s, [i]: e.target.checked }))}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.description}</p>
                      <p className="text-xs text-muted">{dayLabel(c.date)}</p>
                      {c.duplicateOf && (
                        <p className="mt-0.5 text-xs font-medium text-amber-700">
                          {t('Already logged {date}', { date: dayLabel(c.duplicateOf.spent_at) })}
                          {c.duplicateOf.note ? ` · ${c.duplicateOf.note}` : ''}
                        </p>
                      )}
                    </div>
                    <span className="tnum shrink-0 font-semibold">{money(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost py-3 text-base" onClick={() => setStage('map')}>{t('Back')}</button>
              <button className="btn-primary py-3 text-base" disabled={busy || selectedCount === 0} onClick={runImport}>
                {busy ? t('Importing…') : t('Import {n}', { n: selectedCount })}
              </button>
            </div>
          </>
        )}

        {stage === 'done' && (
          <div className="card py-10 text-center">
            <p className="text-4xl">{imported > 0 ? '✅' : '🤷'}</p>
            <p className="mt-2 text-lg font-semibold">
              {imported > 0 ? t('{n} imported', { n: imported }) : t('Nothing imported')}
            </p>
            <p className="mt-1 text-sm text-muted">
              {imported > 0
                ? t('They all landed on one category — sort them from the expenses list.')
                : t('Everything in that file was already in the app.')}
            </p>
            <button className="btn-primary mt-4 w-full" onClick={() => nav('/expenses')}>{t('See expenses')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
