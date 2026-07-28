// GitHub Pages and the Supabase project live on different origins now (unlike
// same-origin Netlify Functions), so every response needs these headers or
// the browser silently rejects the response.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}
