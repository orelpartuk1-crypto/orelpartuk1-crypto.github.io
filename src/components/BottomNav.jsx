import { NavLink, useLocation } from 'react-router-dom'

const items = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/add', label: 'Add', icon: PlusIcon, primary: true },
  { to: '/savings', label: 'Savings', icon: PiggyIcon },
]

// Focused, full-screen flows (their own back button + action bar) hide the nav
// so it never covers their Save / Confirm buttons.
const HIDE_ON = ['/add', '/scan']

export default function BottomNav() {
  const { pathname } = useLocation()
  if (HIDE_ON.includes(pathname)) return null

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-nav safe-bottom">
      <div className="mx-auto flex max-w-md items-end justify-around px-4 pt-1.5">
        {items.map(({ to, label, icon: Icon, end, primary }) =>
          primary ? (
            <NavLink key={to} to={to} className="-mt-6">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 text-white shadow-card active:scale-95 transition">
                <Icon className="h-7 w-7" />
              </span>
            </NavLink>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  isActive ? 'text-brand-500' : 'text-muted'
                }`
              }
            >
              <Icon className="h-6 w-6" />
              {label}
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
function PiggyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 10c1.1 0 2 .9 2 2s-.9 2-2 2v2a2 2 0 0 1-2 2h-1l-.5 1.5a1 1 0 0 1-1 .5h-1a1 1 0 0 1-1-1V20H9v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-1.3A6 6 0 0 1 4 15H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h.6A6 6 0 0 1 9 6h4c3.3 0 6 2.5 6 4Z" />
      <circle cx="15.5" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
