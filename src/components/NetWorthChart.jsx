// A minimal area chart for a run of {snapshot_date, net} points. Deliberately
// plain — this isn't a dashboard chart to analyse, it's a shape that answers
// "is this going up" at a glance.
export default function NetWorthChart({ points, formatValue }) {
  if (points.length < 2) return null

  const W = 320
  const H = 88
  const pad = 6
  const values = points.map((p) => p.net)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const x = (i) => pad + (i / (points.length - 1)) * (W - pad * 2)
  const y = (v) => pad + (1 - (v - min) / span) * (H - pad * 2)

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.net)}`).join(' ')
  const areaPath = `${linePath} L ${x(points.length - 1)} ${H - pad} L ${x(0)} ${H - pad} Z`

  const up = points[points.length - 1].net >= points[0].net

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Net worth over time">
      <defs>
        <linearGradient id="nw-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={up ? '#0f7a3e' : '#d24a3c'} stopOpacity="0.25" />
          <stop offset="100%" stopColor={up ? '#0f7a3e' : '#d24a3c'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#nw-fill)" />
      <path d={linePath} fill="none" stroke={up ? '#0f7a3e' : '#d24a3c'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].net)} r="4" fill={up ? '#0f7a3e' : '#d24a3c'} />
    </svg>
  )
}
