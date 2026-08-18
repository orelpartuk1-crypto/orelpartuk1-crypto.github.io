import { useNavigate } from 'react-router-dom'

// Reusable page header. Optional back button + right-side action slot.
// `wrap`: let the title break onto a second line instead of ellipsizing —
// for a title whose length actually varies (Home's time-of-day greeting +
// name) rather than every other screen's short, fixed word ("Wealth").
// `onBack`: override what the back button does — for a page also rendered
// inside a sheet (Wealth's Savings/Tax/Simulators), nav(-1) would leave the
// sheet's own screen and navigate the real browser history instead of just
// closing it.
export default function TopBar({ title, subtitle, back = false, right = null, wrap = false, onBack }) {
  const nav = useNavigate()
  // A PWA opened from the home-screen icon (or resumed after iOS suspended
  // and reloaded it) starts with an empty history stack — nav(-1) then does
  // exactly what browser "back" does with nothing behind it: nothing. The
  // button just looked stuck. React Router stamps an incrementing `idx` on
  // history.state; 0 (or missing, before the first navigation) means there
  // really is nowhere to go back to, so land on Home instead of no-opping.
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.state?.idx > 0) nav(-1)
    else nav('/')
  }
  // Solid, not blurred — backdrop-filter on a sticky header repaints every
  // scroll frame and is one of the heaviest things a phone GPU can be asked
  // to do continuously. Opaque costs nothing and never looks glitchy the way
  // transparency-without-blur would (text bleeding through crisply instead
  // of softened).
  return (
    <header className="safe-top sticky top-0 z-20 bg-surface px-4 pb-3">
      <div className="mx-auto flex max-w-md items-center gap-3">
        {back && (
          <button
            onClick={onBack || goBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card transition-transform duration-150 active:scale-90"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1">
          {/* clamp() rather than a fixed size: Home's greeting is dynamic
              ("Good afternoon, Orel") and meaningfully longer than every
              other screen's static title ("Wealth", "Categories") — a title
              that scales down on a narrow phone beats one that always
              truncates the same few characters off a name. Wrapping is the
              actual guarantee the whole thing is visible; the shrink is just
              what makes wrapping rarely necessary. */}
          <h1
            className={`text-[clamp(19px,5.8vw,28px)] font-bold leading-tight tracking-tight text-ink ${
              wrap ? '' : 'truncate'
            }`}
          >
            {title}
          </h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  )
}
