import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useExpenses } from '../hooks/useExpenses'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'
import { scanReceipt, parseReceipt } from '../lib/ocr'
import { cloudScan, geminiScan } from '../lib/cloudOcr'
import { findDuplicate } from '../lib/dupCheck'
import { takePendingScan, setPendingReceipt } from '../lib/pendingScan'
import { uploadReceipt } from '../lib/receipts'
import { categoryMeta, defaultSpendType, CATEGORIES, BUSINESS_CATEGORIES, SELF_EXPLANATORY } from '../lib/categories'
import CategoryPicker from '../components/CategoryPicker'
import GrocerySelector from '../components/GrocerySelector'
import Segmented from '../components/Segmented'
import TopBar from '../components/TopBar'
import { money, dayLabel, isoDay } from '../lib/format'
import { t } from '../lib/i18n'

export default function ScanReceipt() {
  const nav = useNavigate()
  const { user, household, hasBusiness } = useAuth()
  const { addExpense } = useExpenses()
  // A scan is still money leaving an account — without this it would be the one
  // way to create an expense that never touches a balance.
  const { active: myAccounts, defaultAccount } = useAccounts()
  const [accountId, setAccountId] = useState(null)
  const { pickList } = useCategories()
  const [categoryId, setCategoryId] = useState(null)
  const fileRef = useRef(null)

  const [preview, setPreview] = useState(null)
  const [imageFile, setImageFile] = useState(null) // kept so we can share it to Dropbox
  const [shareMsg, setShareMsg] = useState(null)
  const [stage, setStage] = useState('idle') // idle | scanning | review
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null) // { amount, category, rawText }
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Other')
  // A scanned receipt is overwhelmingly a supermarket run — shared by
  // default, same as picking Groceries by hand would suggest. No longer
  // reads the last-viewed Analytics zone: that made this (and Add) default
  // to whatever tab you'd happened to check a moment earlier, business
  // included, which is a surprising place to default a scope pill.
  const [scope, setScope] = useState('shared')
  const [spendType, setSpendType] = useState('need')
  const [items, setItems] = useState([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const scopeOptions = [
    { value: 'shared', label: t('🤝 Shared') },
    { value: 'private', label: t('👤 Private') },
    ...(hasBusiness ? [{ value: 'business', label: t('💼 Business') }] : []),
  ]
  const changeScope = (s) => {
    if (s !== scope) setCategoryId(null)
    if (s === 'business' && scope !== 'business') setCategory('Meeting')
    else if (s !== 'business' && scope === 'business') { setCategory('Groceries'); setSpendType(defaultSpendType('Groceries')) }
    setScope(s)
  }
  const [err, setErr] = useState(null)
  const [dupWarn, setDupWarn] = useState(false)

  // If we arrived here from the dashboard camera button, process that photo.
  useEffect(() => {
    const f = takePendingScan()
    if (f) processFile(f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPick = (e) => processFile(e.target.files?.[0])

  const processFile = async (file) => {
    if (!file) return
    setErr(null)
    setImageFile(file)
    setShareMsg(null)
    setPreview(URL.createObjectURL(file))
    setStage('scanning')
    setProgress(0)
    try {
      let res
      try {
        // Gemini reads the photo directly — far more accurate than OCR + regex.
        setProgress(0.4)
        res = await geminiScan(file)
        setProgress(0.9)
      } catch (geminiErr) {
        try {
          // Fall back to traditional cloud OCR.
          setProgress(0.4)
          const text = await cloudScan(file)
          setProgress(0.9)
          res = parseReceipt(text)
        } catch (cloudErr) {
          // Offline / both cloud paths unavailable → fall back to on-device OCR.
          res = await scanReceipt(file, setProgress)
        }
      }
      setResult(res)
      setAmount(res.amount != null ? String(res.amount).replace('.', ',') : '')
      setCategory(res.category || 'Other')
      setCategoryId(null)
      setSpendType(defaultSpendType(res.category || 'Other'))
      // The merchant name becomes the title — every scan reading "Scanned
      // receipt" is exactly the bug this fixes. Left blank when Gemini
      // couldn't read a name, so the same "what was it" requirement as typing
      // an expense by hand kicks in instead of a fake-looking default.
      setNote(res.merchant || '')
      // Several lines of the same product come back merged, so show the count
      // the same way the regex parser does — "3× Cheese", not a bare "Cheese"
      // whose price looks inexplicably high.
      setItems((res.items || []).map((i) => ({
        name: i.qty > 1 ? `${i.qty}× ${i.name}` : i.name,
        price: String(i.price).replace('.', ','),
      })))
      setStage('review')
    } catch (e2) {
      setErr(t('Could not read the receipt. Try a clearer, well-lit photo.'))
      setStage('idle')
    }
  }

  const value = parseFloat((amount || '0').replace(',', '.')) || 0
  const dbCategories = pickList(scope)

  const toItems = () =>
    items
      .filter((i) => i.name && i.name.trim())
      .map((i) => ({ name: i.name.trim(), price: parseFloat((String(i.price) || '0').replace(',', '.')) || 0 }))

  const spentAt = result?.date || isoDay(new Date())
  const needsDescription = !note.trim() && !SELF_EXPLANATORY.has(category)

  const confirm = async (editAfter = false, force = false) => {
    if (value <= 0) return
    // Not gated for editAfter — that path is heading to the Add screen
    // specifically to fill this in, which has the identical requirement itself.
    if (needsDescription && !editAfter) {
      setErr(t("What was this {category} for? Give it a name so you'll recognise it later.", { category: category.toLowerCase() }))
      return
    }
    if (editAfter) {
      // Hand the photo over too, so adjusting the details doesn't drop the receipt.
      setPendingReceipt(imageFile)
      nav('/add', { state: { prefill: { amount: value, category, scope, date: result?.date || undefined, items: toItems(), note: note.trim() || undefined, account_id: accountId || defaultAccount?.id || undefined } } })
      return
    }
    setErr(null)
    if (!force) {
      setBusy(true)
      const dup = await findDuplicate({ household_id: household?.id, paid_by: user?.id, spent_at: spentAt, category, amount: value })
      setBusy(false)
      if (dup) { setDupWarn(true); return }
    }
    setBusy(true); setErr(null)
    const rows = toItems()
    const { data: saved, error } = await addExpense({
      amount: value,
      category,
      scope,
      spend_type: spendType,
      paid_by: user?.id,
      note: note.trim(),
      account_id: accountId || defaultAccount?.id || null,
      category_id: categoryId,
      items: rows.length ? rows : null,
      ...(result?.date ? { spent_at: result.date } : {}),
    })
    // Keep the photo so you can open this expense later and see what it was.
    // A failed upload must not lose the expense itself, so it only warns.
    if (!error && saved?.id && imageFile) {
      const { error: upErr } = await uploadReceipt(saved.id, imageFile)
      if (upErr) setShareMsg(t('Expense saved, but the receipt image could not be stored.'))
    }
    setBusy(false)
    if (error) { setErr(error.message); return }
    nav('/')
  }

  // Open the native share sheet with the invoice image so it can be dropped
  // straight into a Dropbox folder — no Dropbox developer app needed.
  const saveToDropbox = async () => {
    if (!imageFile) return
    setShareMsg(null)
    // The note becomes the filename. Strip only characters filesystems reject —
    // accented and non-Latin letters are kept as typed.
    const fromNote = note.trim().replace(/[\/\\:*?"<>|\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
    const safeCat = (category || 'receipt').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const base = fromNote || `receipt-${safeCat}-${spentAt}`
    const ext = (imageFile.type || '').includes('png') ? 'png' : 'jpg'
    const named = new File([imageFile], `${base}.${ext}`, { type: imageFile.type || 'image/jpeg' })
    try {
      if (navigator.canShare && navigator.canShare({ files: [named] })) {
        // Files only — passing title/text makes Dropbox save a second .txt alongside the image.
        await navigator.share({ files: [named] })
        setShareMsg(t('Share sheet opened — pick Dropbox to save it.'))
      } else {
        // Desktop / unsupported: download the image so it can be moved manually.
        const url = URL.createObjectURL(named)
        const a = document.createElement('a')
        a.href = url; a.download = named.name; a.click()
        URL.revokeObjectURL(url)
        setShareMsg(t('Sharing isn’t supported here — image downloaded instead.'))
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setShareMsg(t('Couldn’t open the share sheet.'))
    }
  }

  return (
    <div className="pb-32">
      <TopBar title={t('Scan receipt')} back />
      <div className="mx-auto max-w-md px-4 space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPick}
        />

        {stage === 'idle' && (
          <button
            onClick={() => fileRef.current?.click()}
            className="card flex w-full flex-col items-center justify-center gap-3 py-14 border-2 border-dashed border-slate-200 active:scale-[0.99]"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-500">
              <CameraIcon className="h-8 w-8" />
            </span>
            <span className="text-lg font-semibold">{t('Snap a receipt')}</span>
            <span className="text-sm text-muted">{t("We'll read the total automatically")}</span>
          </button>
        )}

        {preview && (
          <img src={preview} alt={t('receipt')} className="w-full rounded-xl2 object-cover max-h-56 shadow-card" />
        )}

        {stage === 'scanning' && (
          <div className="card">
            <p className="font-semibold">{t('Reading receipt…')}</p>
            <div className="mt-3 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-muted">{Math.round(progress * 100)}%</p>
          </div>
        )}

        {stage === 'review' && (
          <>
            <div className="card">
              <p className="text-sm text-muted">{t('Detected total')}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl font-bold text-muted">€</span>
                <input
                  className="w-full bg-transparent text-4xl font-bold outline-none"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                  placeholder="0,00"
                />
              </div>
              {result?.amount == null && (
                <p className="mt-1 text-sm text-amber-600">
                  {t("Couldn't detect a total — please type it in.")}
                </p>
              )}
              {result?.date && (
                <p className="mt-1 text-sm text-muted">
                  {t('Detected date: {d}', { d: dayLabel(result.date) })}
                </p>
              )}
            </div>

            <div>
              <label className="label">{t('Type')}</label>
              <Segmented options={scopeOptions} value={scope} onChange={changeScope} />
            </div>

            {scope !== 'business' && (
              <div>
                <label className="label">{t('Need or treat?')}</label>
                <Segmented
                  options={[{ value: 'need', label: t('🧺 Need') }, { value: 'treat', label: t('🍦 Treat') }]}
                  value={spendType}
                  onChange={setSpendType}
                />
              </div>
            )}

            <div>
              <label className="label">
                {t('Category — guessed {emoji}', { emoji: categoryMeta(category).emoji })}
              </label>
              <CategoryPicker
                value={categoryId || category}
                items={dbCategories.length ? dbCategories : (scope === 'business' ? BUSINESS_CATEGORIES : CATEGORIES)}
                onChange={(c) => {
                  if (typeof c === 'string') {
                    setCategoryId(null)
                    setCategory(c)
                    if (scope !== 'business') setSpendType(defaultSpendType(c))
                    return
                  }
                  setCategoryId(c.id)
                  setCategory(c.parentName || c.name)
                  if (scope !== 'business') setSpendType(c.spend_type || defaultSpendType(c.parentName || c.name))
                }}
              />
            </div>

            {category === 'Groceries' && (
              <div>
                <label className="label">
                  {items.length > 0 ? t('Items ({n} found)', { n: items.length }) : t('Items — none detected, add them below')}
                </label>
                <GrocerySelector
                  items={items}
                  onChange={setItems}
                  onUseTotal={(sum) => setAmount(String(sum.toFixed(2)).replace('.', ','))}
                />
              </div>
            )}

            {myAccounts.length > 0 && (
              <div>
                <label className="label">{t('Paid from')}</label>
                <select
                  className="field"
                  value={accountId || defaultAccount?.id || ''}
                  onChange={(e) => setAccountId(e.target.value)}
                >
                  {myAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="label">
                {SELF_EXPLANATORY.has(category) ? t('What was it (optional)') : t('What was it')}
              </label>
              <input
                className={`field ${needsDescription && err ? 'border-spend' : ''}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('e.g. dentist, haircut, massage')}
              />
              <p className="mt-1 text-xs text-muted">
                {result?.merchant ? `${t('Filled in from the receipt — change it if you prefer.')} ` : ''}
                {t('Also used as the filename when you save to Dropbox.')}
              </p>
            </div>

            {result?.rawText && (
              <details className="text-xs text-muted">
                <summary className="cursor-pointer">{t('What the scan read (tap to view / send me)')}</summary>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-2 text-[11px] leading-tight">{result.rawText}</pre>
              </details>
            )}

            {dupWarn && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">
                  {t('⚠️ Possible duplicate — {v} for {cat} on {d} is already logged.', { v: money(value), cat: category, d: dayLabel(spentAt) })}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button className="btn-ghost py-2.5 text-base" onClick={() => setDupWarn(false)}>{t('Cancel')}</button>
                  <button className="btn-primary py-2.5 text-base" disabled={busy} onClick={() => confirm(false, true)}>{t('Add anyway')}</button>
                </div>
              </div>
            )}

            {imageFile && (
              <button
                type="button"
                onClick={saveToDropbox}
                className="btn-ghost flex w-full items-center justify-center gap-2"
              >
                <UploadIcon className="h-5 w-5" /> {t('Save invoice to Dropbox')}
              </button>
            )}
            {shareMsg && <p className="text-center text-xs text-muted">{shareMsg}</p>}

            <div className="grid grid-cols-2 gap-3">
              <button className="btn-ghost" disabled={busy || value <= 0} onClick={() => confirm(true)}>
                {t('Edit details')}
              </button>
              <button className="btn-primary" disabled={busy || value <= 0} onClick={() => confirm(false)}>
                {busy ? t('Saving…') : t('Confirm {v}', { v: money(value) })}
              </button>
            </div>
            <button
              className="w-full text-center text-muted"
              onClick={() => { setStage('idle'); setPreview(null); setResult(null); setImageFile(null); setShareMsg(null) }}
            >
              {t('Retake')}
            </button>
          </>
        )}

        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    </div>
  )
}

function CameraIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  )
}

function UploadIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M12 15V3m0 0-4 4m4-4 4 4" />
    </svg>
  )
}
