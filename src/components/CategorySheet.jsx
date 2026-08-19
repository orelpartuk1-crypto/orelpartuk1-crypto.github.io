import { useMemo, useState } from 'react'
import { Sheet, Tap } from './motion'
import { t } from '../lib/i18n'

// Picking a category is its own screen rather than a grid squeezed into the
// form — with subcategories and a list this long, a search box beats scrolling.
export default function CategorySheet({ open, onClose, items, value, onPick, title = t('Category') }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return items
    return items.filter((c) => (c.name || c.key || '').toLowerCase().includes(needle))
  }, [items, q])

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="space-y-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <input
          className="field"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('Search…')}
          autoComplete="off"
        />

        {filtered.length === 0 && <p className="py-8 text-center text-muted">{t('Nothing matches “{q}”.', { q })}</p>}

        <div className="grid grid-cols-4 gap-2">
          {filtered.map((c) => {
            const id = c.id ?? c.key
            const label = c.name ?? c.key
            const active = value === id
            const isChild = c.depth === 1
            return (
              <Tap
                key={id}
                onClick={() => { onPick(c); onClose() }}
                className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-3 ${
                  active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/5 bg-white text-muted dark:border-white/10'
                }`}
                style={isChild && !active ? { borderStyle: 'dashed' } : undefined}
              >
                <span className="text-2xl leading-none">{c.emoji}</span>
                <span className="text-center text-[11px] font-medium leading-tight">{label}</span>
              </Tap>
            )
          })}
        </div>
      </div>
    </Sheet>
  )
}
