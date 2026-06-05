// DeepBench v5.1.1 | supabase.js | Supabase client singleton
// FEATURE: SH-06 — Supabase client
// NOTE: Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local and Vercel env vars.
// Use the anon (publishable) key — NOT the service key — for client-side queries.

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
