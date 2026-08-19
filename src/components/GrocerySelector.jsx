import { useMemo, useState } from 'react'
import { GROCERY_ITEMS } from '../lib/groceryItems'
import { t } from '../lib/i18n'

// Lets you tag a groceries expense with the actual items bought (+ optional price).
// items: [{ name, price }]  onChange(items)  onUseTotal(sum)
export default function GrocerySelector({ items, onChange, onUseTotal }) {
  const [q, setQ] = useState('')

  const chosen = new Set(items.map((i) => i.name.toLowerCase()))
  // Search matches either the English name or the Spanish alias (e.g. "leche" finds "Milk").
  const suggestions = useMemo(() => {
    const query = q.trim().toLowerCase()
    let list = GROCERY_ITEMS.filter((it) => !chosen.has(it.name.toLowerCase()))
    if (query) list = list.filter((it) => it.name.toLowerCase().includes(query) || it.es?.toLowerCase().includes(query))
    return list.slice(0, 12)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, items])

  const exactExists =
    GROCERY_ITEMS.some((it) => it.name.toLowerCase() === q.trim().toLowerCase() || it.es?.toLowerCase() === q.trim().toLowerCase()) ||
    chosen.has(q.trim().toLowerCase())

  const add = (name) => {
    const clean = name.trim()
    if (!clean || chosen.has(clean.toLowerCase())) return
    onChange([...items, { name: clean, price: '' }])
    setQ('')
  }
  const setPrice = (i, price) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, price } : it)))
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))

  const num = (s) => parseFloat((String(s) || '0').replace(',', '.')) || 0
  const itemsTotal = items.reduce((t, it) => t + num(it.price), 0)

  return (
    <div className="rounded-2xl border border-slate-200 p-3 space-y-3">
      <div>
        <label className="label">{t('What did you buy? (optional)')}</label>
        <input
          className="field"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('Search items… e.g. shampoo')}
        />
      </div>

      {/* suggestions */}
      {(suggestions.length > 0 || (q.trim() && !exactExists)) && (
        <div className="flex flex-wrap gap-2">
          {q.trim() && !exactExists && (
            <button type="button" onClick={() => add(q)} className="rounded-full bg-brand-500 px-3 py-1.5 text-sm font-medium text-white active:scale-95">
              {t('+ Add “{q}”', { q: q.trim() })}
            </button>
          )}
          {suggestions.map((it) => (
            <button key={it.name} type="button" onClick={() => add(it.name)} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm active:scale-95">
              {it.name}
            </button>
          ))}
        </div>
      )}

      {/* chosen items with optional price */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 truncate font-medium">{it.name}</span>
              <div className="flex items-center gap-1 rounded-xl bg-slate-50 px-2.5 py-1.5">
                <span className="text-muted text-sm">€</span>
                <input
                  className="w-14 bg-transparent text-right outline-none font-semibold"
                  inputMode="decimal"
                  value={it.price}
                  onChange={(e) => setPrice(i, e.target.value.replace(/[^0-9.,]/g, ''))}
                  placeholder="0"
                />
              </div>
              <button type="button" onClick={() => remove(i)} className="text-slate-300 hover:text-red-500 px-1" aria-label={t('Remove')}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
          ))}
          {itemsTotal > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-muted">{t('Items total:')} <b className="text-ink">€{itemsTotal.toFixed(2)}</b></span>
              <button type="button" onClick={() => onUseTotal(itemsTotal)} className="text-sm font-medium text-brand-600 active:scale-95">
                {t('Use as amount →')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
