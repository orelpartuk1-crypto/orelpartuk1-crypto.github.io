// Budget progress bar. Turns amber near the limit and red when over.
export default function ProgressBar({ ratio = 0, status = 'ok', color }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100
  const bg =
    status === 'over' ? '#dc2626' : status === 'warn' ? '#f59e0b' : color || '#2f6bff'
  return (
    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: bg }}
      />
    </div>
  )
}
