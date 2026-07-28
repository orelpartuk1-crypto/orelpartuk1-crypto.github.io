// Lightweight SVG donut chart. data: [{ label, value, color }]
export default function Donut({ data, total, size = 150, stroke = 20, center }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  const segments = data.filter((d) => d.value > 0)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
          {total > 0 &&
            segments.map((d, i) => {
              const len = (d.value / total) * c
              const seg = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              )
              offset += len
              return seg
            })}
        </g>
      </svg>
      {center != null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {center}
        </div>
      )}
    </div>
  )
}
