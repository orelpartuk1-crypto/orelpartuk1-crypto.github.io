import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

// Lightweight SVG donut. data: [{ label, value, color }]
//
// Selecting a slice pushes it out and dims the rest, so the chart itself is the
// filter rather than a legend you have to read alongside it.
export default function Donut({ data, total, size = 150, stroke = 20, center, selected = null, onSelect }) {
  const reduced = useReducedMotion()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  const segments = data.filter((d) => d.value > 0)
  const interactive = typeof onSelect === 'function'

  // The ring used to simply exist, fully drawn, the instant it rendered —
  // every other number on these screens animates in and this sat there
  // static, which is a big part of why the app read as flat. Each arc now
  // sweeps out from its own start point, staggered slightly, and because
  // this is a plain CSS transition on stroke-dasharray it also animates
  // whenever the data changes underneath it — switching Out/In, or picking
  // Needs vs Treats, re-draws rather than snapping.
  const [grown, setGrown] = useState(reduced)
  // Only sweep from empty on the FIRST draw. Later data changes transition
  // from whatever was already on screen, which is the more informative move.
  const first = useRef(true)
  useEffect(() => {
    if (reduced) { setGrown(true); return }
    const id = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(id)
  }, [reduced])
  useEffect(() => {
    first.current = false
  }, [])

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
              const thisOffset = offset
              offset += len
              return (
                <g key={d.label ?? i}>
                  {/* A small category (a couple of percent, easily under
                      10px of ring at this stroke width) is nearly
                      impossible to actually land a thumb on — the visible
                      arc IS the tap target. This invisible twin, same
                      dasharray/offset but at a real touch-target width,
                      takes the tap without changing how thin the slice
                      looks. */}
                  {interactive && (
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={r}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={Math.max(stroke, 44)}
                      strokeDasharray={`${len} ${c - len}`}
                      strokeDashoffset={-thisOffset}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSelect(isOn ? null : d.label)}
                    />
                  )}
                  <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={d.color}
                    strokeWidth={isOn ? stroke + 6 : stroke}
                    strokeDasharray={grown ? `${len} ${c - len}` : `0 ${c}`}
                    strokeDashoffset={-thisOffset}
                    strokeLinecap="butt"
                    opacity={dimmed ? 0.25 : 1}
                    style={{
                      pointerEvents: 'none',
                      transition: reduced
                        ? 'none'
                        : 'stroke-dasharray 0.75s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.25s ease, stroke-width 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
                      transitionDelay: first.current ? `${Math.min(i * 60, 300)}ms` : '0ms',
                    }}
                  />
                </g>
              )
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
