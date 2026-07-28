// Big calculator-style numeric pad for fast amount entry (native-app feel).
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del']

export default function Numpad({ value, onChange }) {
  const press = (k) => {
    if (k === 'del') {
      onChange(value.slice(0, -1))
      return
    }
    if (k === ',') {
      if (value.includes(',')) return
      onChange((value || '0') + ',')
      return
    }
    // Cap to 2 decimals.
    if (value.includes(',') && value.split(',')[1]?.length >= 2) return
    // Avoid leading zeros like "00"
    if (value === '0') {
      onChange(k)
      return
    }
    onChange(value + k)
  }

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => press(k)}
          className="h-16 rounded-2xl bg-white text-2xl font-semibold text-ink shadow-sm border border-slate-100
                     active:scale-95 active:bg-slate-50 transition flex items-center justify-center"
        >
          {k === 'del' ? <DelIcon className="h-6 w-6" /> : k}
        </button>
      ))}
    </div>
  )
}

function DelIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 5H8L2 12l6 7h13a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" />
      <path d="m17 9-6 6M11 9l6 6" />
    </svg>
  )
}
