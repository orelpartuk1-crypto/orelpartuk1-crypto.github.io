import { NavLink, useLocation } from 'react-router-dom'

// Add is the single way in for any transaction — one-off or repeating, money
// out or money in. The rest of the bar is for looking, not entering: what was
// spent, what repeats every month, and how the app itself behaves.
const items = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/expenses', label: 'Expenses', icon: ListIcon },
  { to: '/add', label: 'Add', icon: PlusIcon, primary: true },
  { to: '/plan', label: 'Monthly', icon: RepeatIcon },
  { to: '/settings', label: 'Settings', icon: GearIcon },
]

// Focused, full-screen flows (their own back button + action bar) hide the nav
// so it never covers their Save / Confirm buttons.
const HIDE_ON = ['/add', '/scan']

export default function BottomNav() {
  const { pathname } = useLocation()
  if (HIDE_ON.includes(pathname)) return null

  return (
    // Floating, detached from the screen edges — the page scrolls underneath it.
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 safe-bottom">
      <div className="pointer-events-auto mx-auto mb-2 flex max-w-md items-center justify-around rounded-full bg-white/90 px-3 py-2 shadow-nav backdrop-blur-xl">
        {items.map(({ to, label, icon: Icon, end, primary }) =>
          primary ? (
            // Raised above the bar so it reads as the main action, not a tab.
            <NavLink key={to} to={to} aria-label={label} className="-mt-7 px-1">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-fab transition-transform duration-150 active:scale-90">
                <Icon className="h-7 w-7" />
              </span>
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-semibold transition-colors duration-200 ${
                  isActive ? 'text-brand-500' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`rounded-xl px-3 py-1 transition-colors duration-200 ${isActive ? 'bg-brand-50' : ''}`}>
                    <Icon className="h-[22px] w-[22px]" />
                  </span>
                  {label}
                </>
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
function ListIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
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
function GearIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}
