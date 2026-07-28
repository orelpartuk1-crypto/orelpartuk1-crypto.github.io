import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase'
import { AuthProvider, useAuth } from './context/AuthContext'
import BottomNav from './components/BottomNav'
import InstallPrompt from './components/InstallPrompt'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import AddExpense from './pages/AddExpense'
import ScanReceipt from './pages/ScanReceipt'
import Savings from './pages/Savings'
import Settings from './pages/Settings'
import Money from './pages/Money'
import Tax from './pages/Tax'
import Dates from './pages/Dates'
import Recurring from './pages/Recurring'
import Expenses from './pages/Expenses'
import Automate from './pages/Automate'

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
  const { loading, session, household } = useAuth()

  if (loading) return <Splash />
  if (!session) return <Login />
  if (!household) return <Onboarding />

  return (
    <>
      <main className="mx-auto min-h-full max-w-md">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddExpense />} />
          <Route path="/scan" element={<ScanReceipt />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/money" element={<Money />} />
          <Route path="/recurring" element={<Recurring />} />
          <Route path="/expenses" element={<Expenses />} />
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
