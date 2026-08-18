// Lightweight SVG donut. data: [{ label, value, color }]
//
// Selecting a slice pushes it out and dims the rest, so the chart itself is the
// filter rather than a legend you have to read alongside it.
export default function Donut({ data, total, size = 150, stroke = 20, center, selected = null, onSelect }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  const segments = data.filter((d) => d.value > 0)
  const interactive = typeof onSelect === 'function'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-n-100))" strokeWidth={stroke} />
          {total > 0 &&
            segments.map((d, i) => {
              const len = (d.value / total) * c
              const isOn = selected === d.label
              const dimmed = selected != null && !isOn
              const seg = (
                <circle
                  key={d.label ?? i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={isOn ? stroke + 6 : stroke}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  opacity={dimmed ? 0.25 : 1}
                  style={{
                    cursor: interactive ? 'pointer' : undefined,
                    transition: 'opacity 0.25s ease, stroke-width 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  onClick={interactive ? () => onSelect(isOn ? null : d.label) : undefined}
                />
              )
              offset += len
              return seg
            })}
        </g>
      </svg>
      {center != null && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {center}
        </div>
      )}
    </div>
  )
}
