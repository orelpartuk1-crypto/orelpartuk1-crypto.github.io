import { NavLink, useLocation } from 'react-router-dom'
import { useKeyboardInset } from '../hooks/useKeyboardInset'
import { t } from '../lib/i18n'

// Add is the single way in for any transaction — one-off or repeating, money
// out or money in. The rest of the bar is for looking, not entering: what was
// spent, what repeats every month, and how the app itself behaves.
// Settings isn't here — it's the gear on the Home header, and a tab is too
// prominent for something opened a few times a year.
// Simulators gave up their slot for Together — a couple's app should have the
// couple on the bar, and a calculator you open twice a year should not.
const items = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/together', label: 'Together', icon: HeartIcon },
  { to: '/add', label: 'Add', icon: PlusIcon, primary: true },
  { to: '/wealth', label: 'Wealth', icon: ChartIcon },
  { to: '/analytics', label: 'Analytics', icon: PieIcon },
]

// Focused, full-screen flows (their own back button + action bar) hide the nav
// so it never covers their Save / Confirm buttons.
const HIDE_ON = ['/add', '/scan']

export default function BottomNav() {
  const { pathname } = useLocation()
  const keyboardInset = useKeyboardInset()
  if (HIDE_ON.includes(pathname)) return null

  return (
    // Floating, detached from the screen edges — the page scrolls underneath it.
    // Shifted up by `keyboardInset` so it tracks the real visible edge instead
    // of the fixed layout viewport iOS leaves untouched (see useKeyboardInset).
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 safe-bottom"
      style={keyboardInset ? { transform: `translateY(-${keyboardInset}px)` } : undefined}
    >
      {/* Solid, not blurred — same reasoning as TopBar: a fixed element that's
          always on screen paying a continuous backdrop-filter cost is a real
          drag on a phone GPU, and it's paid on every single screen. */}
      <div className="pointer-events-auto mx-auto mb-2 flex max-w-md items-center justify-around rounded-full bg-white px-3 py-2 shadow-nav">
        {items.map(({ to, label, icon: Icon, end, primary }) =>
          primary ? (
            // Raised above the bar so it reads as the main action, not a tab.
            <NavLink key={to} to={to} aria-label={t(label)} className="-mt-7 px-1">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-fab transition-transform duration-150 active:scale-90">
                <Icon className="h-7 w-7" />
              </span>
            </NavLink>
          ) : (
            // Icon only, no caption underneath — five distinct icons don't
            // need a label each to stay readable, and the extra text was
            // the one thing still making this bar look like a website's
            // nav instead of a native tab bar. The active tab gets a full
            // pill behind the icon rather than a label change, so "where
            // am I" is still obvious at a glance.
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={t(label)}
              className="flex flex-1 items-center justify-center py-1.5"
            >
              {({ isActive }) => (
                <span
                  className={`flex items-center justify-center rounded-2xl px-5 py-2.5 transition-colors duration-200 ${
                    isActive ? 'bg-brand-50 text-brand-500' : 'text-muted'
                  }`}
                >
                  <Icon className="h-[22px] w-[22px]" />
                </span>
              )}
            </NavLink>
          )
        )}
      </div>
    </nav>
  )
}

function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  )
}
function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
function HeartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 2.6c0 5.8-8.5 11.3-8.5 11.3Z" />
    </svg>
  )
}
function PieIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15.5A9 9 0 1 1 8.5 3" />
      <path d="M21.5 11.5A9.5 9.5 0 0 0 12.5 2.5V11a.5.5 0 0 0 .5.5Z" />
    </svg>
  )
}
function RepeatIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}
function ChartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 20V10M12 20V4M19 20v-6" />
    </svg>
  )
}
