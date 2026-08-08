// DeepBench v5.3.11 | supabase.js | Supabase client singleton
// FEATURE: SH-06 — Supabase client
// NOTE: Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local and Vercel env vars.
// Use the anon (publishable) key — NOT the service key — for client-side queries.
// FEATURE: S-APPLE-03a-2 — import.meta.env only exists under Vite's bundler; plain Node.js
// test runs (STANDARDS.md Node test) have no import.meta.env, so any test importing this
// module (even transitively, e.g. via useAIActivity.js) crashed on module load. Falls back
// to process.env, which already carries the same VITE_-prefixed values via .env.local.

import { createClient } from "@supabase/supabase-js";

const env = (typeof import.meta !== 'undefined' && import.meta.env) || process.env;

export const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);
