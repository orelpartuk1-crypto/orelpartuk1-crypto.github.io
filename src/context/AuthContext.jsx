import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { isoDay } from '../lib/format'

const AuthContext = createContext(null)

// Shared by every auth event in the tab, so the monthly charges are generated
// once per cold open rather than once per event.
let materializing = null
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [priv, setPriv] = useState(null) // user_private: { monthly_income, has_business }
  const [household, setHousehold] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [recoveryMode, setRecoveryMode] = useState(false) // true after a "reset password" email link is opened

  // Load the profile + household + members for the signed-in user.
  const refreshProfile = useCallback(async (uid) => {
    if (!uid) {
      setProfile(null)
      setPriv(null)
      setHousehold(null)
      setMembers([])
      return
    }
    const [{ data: prof }, { data: priv }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('user_private').select('*').eq('owner', uid).maybeSingle(),
    ])
    setProfile(prof || null)
    // Ensure a private row exists, then keep it in state.
    let mine = priv
    if (!mine) {
      await supabase.from('user_private').insert({ owner: uid }).select().maybeSingle()
      mine = { owner: uid, monthly_income: 0, has_business: false }
    }
    setPriv(mine)

    if (prof?.household_id) {
      const [{ data: h }, { data: mem }] = await Promise.all([
        supabase.from('households').select('*').eq('id', prof.household_id).maybeSingle(),
        supabase
          .from('profiles')
          .select('id, display_name')
          .eq('household_id', prof.household_id)
          .order('created_at', { ascending: true }),
      ])
      setHousehold(h || null)
      setMembers(mem || [])
      // Generate this month's recurring items (Netflix, monthly income…) if missing.
      // Auth fires several events on a cold open, and each one lands here; the
      // RPC's own "does this month already exist" check can't see an insert
      // that a sibling call hasn't committed yet, so three of them at once used
      // to produce three identical charges. One in flight at a time, and the
      // unique index added in schema_v18 catches whatever still slips past.
      const first = new Date()
      first.setDate(1)
      if (!materializing) {
        materializing = supabase
          .rpc('materialize_recurring', { p_month: isoDay(first) })
          .then(() => { materializing = null })
      }
      await materializing
    } else {
      setHousehold(null)
      setMembers([])
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await refreshProfile(data.session?.user?.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      setSession(s)
      await refreshProfile(s?.user?.id)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [refreshProfile])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    household,
    members,
    loading,
    myIncome: Number(priv?.monthly_income || 0),
    hasBusiness: Boolean(priv?.has_business),
    quickKey: priv?.quick_key || null,
    reminderHour: priv?.reminder_hour ?? null, // null = daily push reminder off
    recoveryMode,
    refreshProfile: () => refreshProfile(session?.user?.id),

    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),

    signUp: (email, password, display_name) =>
      supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name } },
      }),

    signOut: () => supabase.auth.signOut(),

    async createHousehold(name) {
      const { data, error } = await supabase.rpc('create_household', { p_name: name })
      if (!error) await refreshProfile(session?.user?.id)
      return { data, error }
    },

    async joinHousehold(code) {
      const { data, error } = await supabase.rpc('join_household', { p_code: code })
      if (!error) await refreshProfile(session?.user?.id)
      return { data, error }
    },

    async updateDisplayName(name) {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: name })
        .eq('id', session?.user?.id)
      if (!error) await refreshProfile(session?.user?.id)
      return { error }
    },

    async updateBudget(monthly_budget) {
      const { error } = await supabase
        .from('households')
        .update({ monthly_budget })
        .eq('id', household?.id)
      if (!error) await refreshProfile(session?.user?.id)
      return { error }
    },

    async updateMonthlyIncome(monthly_income) {
      const { error } = await supabase
        .from('user_private')
        .upsert({ owner: session?.user?.id, monthly_income, updated_at: new Date().toISOString() })
      if (!error) await refreshProfile(session?.user?.id)
      return { error }
    },

    async setHasBusiness(has_business) {
      const { error } = await supabase
        .from('user_private')
        .upsert({ owner: session?.user?.id, has_business, updated_at: new Date().toISOString() })
      if (!error) await refreshProfile(session?.user?.id)
      return { error }
    },

    async updateReminderHour(reminder_hour) {
      const { error } = await supabase
        .from('user_private')
        .upsert({ owner: session?.user?.id, reminder_hour, updated_at: new Date().toISOString() })
      if (!error) await refreshProfile(session?.user?.id)
      return { error }
    },

    async updatePassword(newPassword) {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (!error) setRecoveryMode(false)
      return { error }
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
