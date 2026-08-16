import { CATEGORIES } from '../lib/categories'

// Tappable category grid. Accepts either the household's own categories from
// the database ({ id, name, emoji, color, depth }) or the built-in fallback
// list ({ key, emoji, color }), so the screen still works on a cold load before
// categories arrive.
//
// onChange receives the whole item — callers need the id to store the exact
// choice and the root name to keep reports grouping the way they always have.
export default function CategoryPicker({ value, onChange, items = CATEGORIES }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((c) => {
        const id = c.id ?? c.key
        const label = c.name ?? c.key
        const active = value === id
        const isChild = c.depth === 1
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(c.id ? c : c.key, c)}
            className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-2.5 transition-transform duration-150 active:scale-90 ${
              active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/5 bg-white text-muted'
            }`}
            style={isChild && !active ? { borderStyle: 'dashed' } : undefined}
          >
            <span className="text-2xl leading-none">{c.emoji}</span>
            <span className="text-center text-[11px] font-medium leading-tight">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
