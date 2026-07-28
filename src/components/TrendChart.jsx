import { moneyShort, money } from '../lib/format'

// Simple, dependency-free SVG bar chart of monthly spending.
// Highlights the current (last) month and marks the average.
export default function TrendChart({ data }) {
  if (!data || data.length === 0) return null

  const max = Math.max(1, ...data.map((d) => d.total))
  const avg = data.reduce((t, d) => t + d.total, 0) / data.length

  const W = 320
  const H = 150
  const padB = 22 // room for month labels
  const chartH = H - padB
  const gap = 10
  const barW = (W - gap * (data.length - 1)) / data.length
  const avgY = chartH - (avg / max) * chartH

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Monthly spending trend">
        {/* average line */}
        {avg > 0 && (
          <line
            x1="0" x2={W} y1={avgY} y2={avgY}
            stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4"
          />
        )}
        {data.map((d, i) => {
          const h = (d.total / max) * chartH
          const x = i * (barW + gap)
          const y = chartH - h
          const isCurrent = i === data.length - 1
          return (
            <g key={d.key}>
              <rect
                x={x} y={y} width={barW} height={Math.max(h, 2)}
                rx="6"
                fill={isCurrent ? '#2f6bff' : '#c7d7ff'}
              />
              {d.total > 0 && (
                <text
                  x={x + barW / 2} y={y - 4}
                  textAnchor="middle" fontSize="9" fontWeight="600"
                  fill={isCurrent ? '#1a49bd' : '#64748b'}
                >
                  {moneyShort(d.total)}
                </text>
              )}
              <text
                x={x + barW / 2} y={H - 6}
                textAnchor="middle" fontSize="10"
                fill={isCurrent ? '#0f172a' : '#94a3b8'}
                fontWeight={isCurrent ? '700' : '400'}
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="mt-1 text-xs text-muted text-center">
        Dashed line = {money(avg)} monthly average
      </p>
    </div>
  )
}
