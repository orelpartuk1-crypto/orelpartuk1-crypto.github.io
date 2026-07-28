// iOS-style segmented control. options: [{ value, label }]
export default function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-2xl bg-slate-100 p-1">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-xl py-2.5 text-base font-semibold transition ${
              active ? 'bg-white text-ink shadow-sm' : 'text-muted'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
