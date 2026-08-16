import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useExpenses } from '../hooks/useExpenses'
import { scanReceipt, parseReceipt } from '../lib/ocr'
import { cloudScan, geminiScan } from '../lib/cloudOcr'
import { findDuplicate } from '../lib/dupCheck'
import { takePendingScan, setPendingReceipt } from '../lib/pendingScan'
import { uploadReceipt } from '../lib/receipts'
import { categoryMeta, defaultSpendType, CATEGORIES, BUSINESS_CATEGORIES } from '../lib/categories'
import CategoryPicker from '../components/CategoryPicker'
import GrocerySelector from '../components/GrocerySelector'
import Segmented from '../components/Segmented'
import TopBar from '../components/TopBar'
import { money, dayLabel, isoDay } from '../lib/format'

export default function ScanReceipt() {
  const nav = useNavigate()
  const { user, household, hasBusiness } = useAuth()
  const { addExpense } = useExpenses()
  const fileRef = useRef(null)

  const [preview, setPreview] = useState(null)
  const [imageFile, setImageFile] = useState(null) // kept so we can share it to Dropbox
  const [shareMsg, setShareMsg] = useState(null)
  const [stage, setStage] = useState('idle') // idle | scanning | review
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null) // { amount, category, rawText }
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Other')
  const [scope, setScope] = useState(() => (localStorage.getItem('db_zone') === 'mine' ? 'private' : 'shared'))
  const [spendType, setSpendType] = useState('need')
  const [items, setItems] = useState([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const scopeOptions = [
    { value: 'shared', label: '🤝 Shared' },
    { value: 'private', label: '👤 Private' },
    ...(hasBusiness ? [{ value: 'business', label: '💼 Business' }] : []),
  ]
  const changeScope = (s) => {
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
      setSpendType(defaultSpendType(res.category || 'Other'))
      // Several lines of the same product come back merged, so show the count
      // the same way the regex parser does — "3× Cheese", not a bare "Cheese"
      // whose price looks inexplicably high.
      setItems((res.items || []).map((i) => ({
        name: i.qty > 1 ? `${i.qty}× ${i.name}` : i.name,
        price: String(i.price).replace('.', ','),
      })))
      setStage('review')
    } catch (e2) {
      setErr('Could not read the receipt. Try a clearer, well-lit photo.')
      setStage('idle')
    }
  }

  const value = parseFloat((amount || '0').replace(',', '.')) || 0

  const toItems = () =>
    items
      .filter((i) => i.name && i.name.trim())
      .map((i) => ({ name: i.name.trim(), price: parseFloat((String(i.price) || '0').replace(',', '.')) || 0 }))

  const spentAt = result?.date || isoDay(new Date())

  const confirm = async (editAfter = false, force = false) => {
    if (value <= 0) return
    if (editAfter) {
      // Hand the photo over too, so adjusting the details doesn't drop the receipt.
      setPendingReceipt(imageFile)
      nav('/add', { state: { prefill: { amount: value, category, scope, date: result?.date || undefined, items: toItems(), note: note.trim() || undefined } } })
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
      note: note.trim() || 'Scanned receipt',
      items: rows.length ? rows : null,
      ...(result?.date ? { spent_at: result.date } : {}),
    })
    // Keep the photo so you can open this expense later and see what it was.
    // A failed upload must not lose the expense itself, so it only warns.
    if (!error && saved?.id && imageFile) {
      const { error: upErr } = await uploadReceipt(saved.id, imageFile)
      if (upErr) setShareMsg('Expense saved, but the receipt image could not be stored.')
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
        setShareMsg('Share sheet opened — pick Dropbox to save it.')
      } else {
        // Desktop / unsupported: download the image so it can be moved manually.
        const url = URL.createObjectURL(named)
        const a = document.createElement('a')
        a.href = url; a.download = named.name; a.click()
        URL.revokeObjectURL(url)
        setShareMsg('Sharing isn’t supported here — image downloaded instead.')
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setShareMsg('Couldn’t open the share sheet.')
    }
  }

  return (
    <div className="pb-32">
      <TopBar title="Scan receipt" back />
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
            <span className="text-lg font-semibold">Snap a receipt</span>
            <span className="text-sm text-muted">We'll read the total automatically</span>
          </button>
        )}

        {preview && (
          <img src={preview} alt="receipt" className="w-full rounded-xl2 object-cover max-h-56 shadow-card" />
        )}

        {stage === 'scanning' && (
          <div className="card">
            <p className="font-semibold">Reading receipt…</p>
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
              <p className="text-sm text-muted">Detected total</p>
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
                  Couldn't detect a total — please type it in.
                </p>
              )}
              {result?.date && (
                <p className="mt-1 text-sm text-muted">
                  Detected date: {dayLabel(result.date)}
                </p>
              )}
            </div>

            <div>
              <label className="label">Type</label>
              <Segmented options={scopeOptions} value={scope} onChange={changeScope} />
            </div>

            {scope !== 'business' && (
              <div>
                <label className="label">Need or treat?</label>
                <Segmented
                  options={[{ value: 'need', label: '🧺 Need' }, { value: 'treat', label: '🍦 Treat' }]}
                  value={spendType}
                  onChange={setSpendType}
                />
              </div>
            )}

            <div>
              <label className="label">
                Category — guessed {categoryMeta(category).emoji}
              </label>
              <CategoryPicker
                value={category}
                items={scope === 'business' ? BUSINESS_CATEGORIES : CATEGORIES}
                onChange={(c) => {
                  setCategory(c)
                  if (scope !== 'business') setSpendType(defaultSpendType(c))
                }}
              />
            </div>

            {category === 'Groceries' && (
              <div>
                <label className="label">
                  Items {items.length > 0 ? `(${items.length} found)` : '— none detected, add them below'}
                </label>
                <GrocerySelector
                  items={items}
                  onChange={setItems}
                  onUseTotal={(sum) => setAmount(String(sum.toFixed(2)).replace('.', ','))}
                />
              </div>
            )}

            <div>
              <label className="label">Note (optional)</label>
              <input
                className="field"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. dinner with Adi"
              />
              <p className="mt-1 text-xs text-muted">Also used as the filename when you save to Dropbox.</p>
            </div>

            {result?.rawText && (
              <details className="text-xs text-muted">
                <summary className="cursor-pointer">What the scan read (tap to view / send me)</summary>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-2 text-[11px] leading-tight">{result.rawText}</pre>
              </details>
            )}

            {dupWarn && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">
                  ⚠️ Possible duplicate — {money(value)} for {category} on {dayLabel(spentAt)} is already logged.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button className="btn-ghost py-2.5 text-base" onClick={() => setDupWarn(false)}>Cancel</button>
                  <button className="btn-primary py-2.5 text-base" disabled={busy} onClick={() => confirm(false, true)}>Add anyway</button>
                </div>
              </div>
            )}

            {imageFile && (
              <button
                type="button"
                onClick={saveToDropbox}
                className="btn-ghost flex w-full items-center justify-center gap-2"
              >
                <UploadIcon className="h-5 w-5" /> Save invoice to Dropbox
              </button>
            )}
            {shareMsg && <p className="text-center text-xs text-muted">{shareMsg}</p>}

            <div className="grid grid-cols-2 gap-3">
              <button className="btn-ghost" disabled={busy || value <= 0} onClick={() => confirm(true)}>
                Edit details
              </button>
              <button className="btn-primary" disabled={busy || value <= 0} onClick={() => confirm(false)}>
                {busy ? 'Saving…' : `Confirm ${money(value)}`}
              </button>
            </div>
            <button
              className="w-full text-center text-muted"
              onClick={() => { setStage('idle'); setPreview(null); setResult(null); setImageFile(null); setShareMsg(null) }}
            >
              Retake
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
