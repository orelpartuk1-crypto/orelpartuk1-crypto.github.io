import { CATEGORIES } from '../lib/categories'

// Horizontal-wrapping grid of tappable category chips.
export default function CategoryPicker({ value, onChange, items = CATEGORIES }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((c) => {
        const active = value === c.key
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            className={`flex flex-col items-center gap-1 rounded-2xl py-2.5 px-1 border transition active:scale-95 ${
              active
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-slate-100 bg-white text-muted'
            }`}
          >
            <span className="text-2xl leading-none">{c.emoji}</span>
            <span className="text-[11px] font-medium leading-tight text-center">{c.key}</span>
          </button>
        )
      })}
    </div>
  )
}
