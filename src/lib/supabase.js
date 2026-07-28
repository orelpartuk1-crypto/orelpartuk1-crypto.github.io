import { createClient } from '@supabase/supabase-js'

// These are the PUBLIC project URL + publishable key. They are designed to be
// shipped in the browser bundle — your data is protected by Row Level Security,
// not by hiding this key. Baking them in means the deployed site needs no config.
// (A local .env still overrides them for development.)
const DEFAULT_URL = 'https://bckxqcyyvhxlcfbyvgzl.supabase.co'
const DEFAULT_KEY = 'sb_publishable_uns5CoujX97-YWiNEHifLw_cS6LhruN'

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_KEY

// Exposed for the Siri/Shortcut quick-log setup screen.
export const SUPABASE_URL = url
export const SUPABASE_ANON_KEY = anonKey

// Surfaced clearly in the UI (see App.jsx) so setup mistakes are obvious.
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
