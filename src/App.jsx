import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase'
import { AuthProvider, useAuth } from './context/AuthContext'
import BottomNav from './components/BottomNav'
import InstallPrompt from './components/InstallPrompt'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Onboarding from './pages/Onboarding'
import Intro from './pages/Intro'
import Home from './pages/Home'
import Couple from './pages/Couple'
import Profile from './pages/Profile'
import Movements from './pages/Movements'
import Upcoming from './pages/Upcoming'
import GroceryAnalysis from './pages/GroceryAnalysis'
import AddExpense from './pages/AddExpense'
import ScanReceipt from './pages/ScanReceipt'
import Savings from './pages/Savings'
import Settings from './pages/Settings'
import Plan from './pages/Plan'
import Accounts from './pages/Accounts'
import Wealth from './pages/Wealth'
import Categories from './pages/Categories'
import Analytics from './pages/Analytics'
import ImportBank from './pages/ImportBank'
import Simulators from './pages/Simulators'
import Salary from './pages/Salary'
import Tax from './pages/Tax'
import Dates from './pages/Dates'
import Recurring from './pages/Recurring'
import Automate from './pages/Automate'

// The browser keeps the previous page's scroll position when the route
// changes, so opening Add from halfway down Home dropped you into the middle
// of the form with the amount field already off-screen above. Every screen
// starts at its own top.
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Splash({ text = 'Loading…' }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-3">
      <img src="/icon.svg" alt="" className="h-16 w-16 rounded-2xl animate-pulse" />
      <p className="text-muted">{text}</p>
    </div>
  )
}

function SetupNeeded() {
  return (
    <div className="min-h-full flex items-center justify-center px-6">
      <div className="card max-w-sm">
        <h1 className="text-xl font-bold">Almost there 🔧</h1>
        <p className="mt-2 text-muted">
          Supabase isn't configured yet. Create a project at supabase.com, run{' '}
          <code className="rounded bg-slate-100 px-1">supabase/schema.sql</code>, then copy{' '}
          <code className="rounded bg-slate-100 px-1">.env.example</code> to{' '}
          <code className="rounded bg-slate-100 px-1">.env</code> with your project URL and anon key
          and restart the dev server.
        </p>
      </div>
    </div>
  )
}

// Shell that decides what to show based on auth state.
function Shell() {
  const { loading, session, household, recoveryMode } = useAuth()

  if (loading) return <Splash />
  if (recoveryMode) return <ResetPassword />
  if (!session) return <Login />
  if (!household) return <Onboarding />

  return (
    <>
      <ScrollToTop />
      <main className="mx-auto min-h-full max-w-md">
        {/* A route-level slide sounded nice but stacked on top of every
            page's own entrance animation — exit, then enter, then that
            page's own fade-up — and made ordinary navigation feel heavy.
            Each page's own Screen wrapper already animates in on its own;
            that's enough. */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/together" element={<Couple />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/movements" element={<Movements />} />
          <Route path="/upcoming" element={<Upcoming />} />
          <Route path="/groceries" element={<GroceryAnalysis />} />
          {/* The money coach retired as its own page — it's a couple of
              inline insight lines on Together and Analytics now. Old
              links land somewhere real instead of 404ing. */}
          <Route path="/coach" element={<Navigate to="/together" replace />} />
          <Route path="/intro" element={<Intro />} />
          <Route path="/add" element={<AddExpense />} />
          <Route path="/scan" element={<ScanReceipt />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/wealth" element={<Wealth />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/import" element={<ImportBank />} />
          <Route path="/simulators" element={<Simulators />} />
          <Route path="/salary" element={<Salary />} />
          {/* Rent moved to the normal recurring-expense flow. */}
          <Route path="/bills" element={<Navigate to="/recurring" replace />} />
          {/* Income & bills split into Salary and Bills; keep the old path
              working so a home-screen icon saved to it still lands somewhere. */}
          <Route path="/money" element={<Navigate to="/plan" replace />} />
          <Route path="/recurring" element={<Recurring />} />
          {/* Superseded by /movements, which shows money in as well as out.
              Kept as a redirect so old links and saved icons still land. */}
          <Route path="/expenses" element={<Navigate to="/movements" replace />} />
          <Route path="/automate" element={<Automate />} />
          <Route path="/tax" element={<Tax />} />
          <Route path="/dates" element={<Dates />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </>
  )
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupNeeded />
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
        <InstallPrompt />
      </AuthProvider>
    </BrowserRouter>
  )
}
