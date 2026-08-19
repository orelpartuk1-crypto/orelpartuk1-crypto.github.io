import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Whether the "get to know you" questionnaire still wants asking, and the two
// ways that stops: finishing it, or asking to be left alone for a while.
//
// Deliberately never opens itself. It surfaces as something you can choose to
// start — an alert you can dismiss — because a wall of questions that appears
// unbidden on launch is the fastest way to make someone close an app.
export function useIntro() {
  const { user } = useAuth()
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('user_private')
        .select('intro_done_at, intro_snoozed_until, monthly_spend_estimate, monthly_income')
        .eq('owner', user.id)
        .maybeSingle()
      setRow(data || null)
    } catch (e) {
      console.error('useIntro load failed', e)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const patch = useCallback(
    async (fields) => {
      if (!user?.id) return { error: new Error('no user') }
      const { error } = await supabase
        .from('user_private')
        .upsert({ owner: user.id, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'owner' })
      if (!error) await load()
      return { error }
    },
    [user?.id, load]
  )

  const finish = useCallback(
    (extra = {}) => patch({ intro_done_at: new Date().toISOString(), ...extra }),
    [patch]
  )

  // "Not now" means not now, not never — a week is long enough not to nag and
  // short enough that the offer doesn't silently disappear forever.
  const snooze = useCallback(
    (days = 7) =>
      patch({ intro_snoozed_until: new Date(Date.now() + days * 86400000).toISOString() }),
    [patch]
  )

  const done = !!row?.intro_done_at
  const snoozed = row?.intro_snoozed_until ? new Date(row.intro_snoozed_until) > new Date() : false
  // Only worth offering once we know the answer either way — offering it while
  // still loading makes it flash in and out on every launch.
  const shouldOffer = !loading && !!user?.id && !done && !snoozed

  return { row, loading, done, snoozed, shouldOffer, finish, snooze, patch, reload: load }
}
