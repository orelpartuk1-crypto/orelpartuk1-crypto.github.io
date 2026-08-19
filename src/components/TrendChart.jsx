import { moneyShort, money } from '../lib/format'
import { t } from '../lib/i18n'

// Simple, dependency-free SVG bar chart of monthly spending.
// Highlights the current (last) month and marks the average.
export default function TrendChart({ data: rawData }) {
  if (!rawData || rawData.length === 0) return null

  // Drop leading months with no spend at all — those are almost always
  // "before you started using the app", not genuine €0 months, and including
  // them would drag the average down and make it misleading. A real €0 month
  // AFTER tracking started still counts normally.
  const firstActive = rawData.findIndex((d) => d.total > 0)
  const data = firstActive === -1 ? rawData : rawData.slice(firstActive)

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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t('Monthly spending trend')}>
        {/* average line */}
        {avg > 0 && (
          <line
            x1="0" x2={W} y1={avgY} y2={avgY}
            stroke="rgb(var(--c-n-400))" strokeWidth="1" strokeDasharray="4 4"
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
                fill={isCurrent ? 'rgb(var(--c-brand-500))' : 'rgb(var(--c-brand-100))'}
              />
              {d.total > 0 && (
                <text
                  x={x + barW / 2} y={y - 4}
                  textAnchor="middle" fontSize="9" fontWeight="600"
                  fill={isCurrent ? 'rgb(var(--c-brand-700))' : 'rgb(var(--c-muted))'}
                >
                  {moneyShort(d.total)}
                </text>
              )}
              <text
                x={x + barW / 2} y={H - 6}
                textAnchor="middle" fontSize="10"
                fill={isCurrent ? 'rgb(var(--c-ink))' : 'rgb(var(--c-n-400))'}
                fontWeight={isCurrent ? '700' : '400'}
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="mt-1 text-xs text-muted text-center">
        {t('Dashed line = {avg} monthly average', { avg: money(avg) })}
      </p>
    </div>
  )
}
