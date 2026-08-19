import { useEffect, useState } from 'react'
import { receiptUrl } from '../lib/receipts'
import { money, dayLabel } from '../lib/format'
import { t } from '../lib/i18n'

// Full-screen look at a stored receipt — the point is remembering what a line
// on the list actually was, so the expense's own details sit under the picture.
export default function ReceiptViewer({ expense, onClose }) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setUrl(null)
    setFailed(false)
    if (!expense?.receipt_path) return
    receiptUrl(expense.receipt_path).then((u) => {
      if (!active) return
      if (u) setUrl(u)
      else setFailed(true)
    })
    return () => { active = false }
  }, [expense?.receipt_path])

  // Escape closes, and the page behind must not scroll while this is open.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!expense) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate font-semibold">{expense.category}{expense.note ? ` · ${expense.note}` : ''}</p>
          <p className="text-sm text-white/70">{dayLabel(expense.spent_at)} · {money(expense.amount)}</p>
        </div>
        <button onClick={onClose} aria-label={t('Close')} className="ml-3 shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold">
          {t('Close')}
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
        {!url && !failed && <p className="text-white/70">{t('Loading receipt…')}</p>}
        {failed && <p className="text-white/70">{t('That receipt image could not be loaded.')}</p>}
        {url && <img src={url} alt={t('Receipt')} className="max-h-full max-w-full rounded-xl object-contain" />}
      </div>
    </div>
  )
}
