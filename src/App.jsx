import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase'
import { AuthProvider, useAuth } from './context/AuthContext'
import BottomNav from './components/BottomNav'
import InstallPrompt from './components/InstallPrompt'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
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
import Bills from './pages/Bills'
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
  const { loading, session, household, recoveryMode } = useAuth()

  if (loading) return <Splash />
  if (recoveryMode) return <ResetPassword />
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
          <Route path="/plan" element={<Plan />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/wealth" element={<Wealth />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/import" element={<ImportBank />} />
          <Route path="/simulators" element={<Simulators />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/bills" element={<Bills />} />
          {/* Income & bills split into Salary and Bills; keep the old path
              working so a home-screen icon saved to it still lands somewhere. */}
          <Route path="/money" element={<Navigate to="/plan" replace />} />
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
