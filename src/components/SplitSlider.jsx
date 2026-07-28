import { money } from '../lib/format'

// Slider for "how much the partner owes back" — used only for shared treats.
// value: current percent (0-100, integer). onChange: (pct) => void.
// amount: total expense amount in euros, for the live € label.
export default function SplitSlider({ value, onChange, amount, partnerName = 'They' }) {
  const owed = Math.round(((amount * value) / 100) * 100) / 100
  return (
    <div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 appearance-none rounded-full bg-slate-100 cursor-pointer accent-brand-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:shadow-sm
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
          [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
      />
      <p className="mt-1.5 text-sm text-muted">
        {value > 0
          ? `${partnerName} owes you ${money(owed)} · ${value}%`
          : 'You cover this one — nothing owed back.'}
      </p>
    </div>
  )
}
