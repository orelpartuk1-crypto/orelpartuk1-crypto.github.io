// iOS-style segmented control. options: [{ value, label }]
export default function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-full bg-black/[0.04] p-1">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-full py-2.5 text-base font-semibold transition-all duration-200 ${
              active ? 'bg-white text-ink shadow-card' : 'text-muted'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
