# DeepBench v5.1 — Environment Variables Reference

> Variable names only — never store actual values in GitHub.
> Actual values live in: Vercel dashboard (frontend) and Railway dashboard (backend).
> Local dev: `.env.local` (never committed — in .gitignore)

---

## Frontend (Vercel — `deepbench-frontend`)

| Variable | Purpose | Required |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | ✅ |
| `ANTHROPIC_API_KEY` | Anthropic Claude API (serverless api/ functions) | ✅ |
| `SUPABASE_URL` | Supabase URL for serverless functions | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-side only) | ✅ |
| `OPENAI_API_KEY` | OpenAI embeddings (`text-embedding-3-small`) | ✅ |
| `VITE_FETCH_API_URL` | Railway backend base URL | ✅ |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Vercel protection bypass for automated QA testing | dev only |

---

## Backend (Railway — `deepbench-backend`)

| Variable | Purpose | Required |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API (Brent ReAct loop) | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | ✅ |
| `OPENAI_API_KEY` | OpenAI embeddings for web memory | ✅ |
| `PORT` | Railway sets automatically | auto |
| `ALLOWED_ORIGINS` | CORS — set to `https://deepbench.roadmapventure.com` | ✅ |
| `VERCEL_API_BASE` | Frontend URL for callbacks | ✅ |

---

## NIGP Frontend (Vercel — `nigp-analyzer`)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `ANTHROPIC_API_KEY` | Claude API |
| `SUPABASE_SERVICE_KEY` | Service key for serverless |
| `OPENAI_API_KEY` | Embeddings |
| `VITE_FETCH_API_URL` | Points to nigp-analyzer-agent-api on Railway |

## NIGP Backend (Railway — `nigp-analyzer-agent-api`)

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API |
| `SUPABASE_URL` | Supabase URL |
| `SUPABASE_SERVICE_KEY` | Service key |
| `OPENAI_API_KEY` | Embeddings |
| `PORT` | Auto-set by Railway |
| `ALLOWED_ORIGINS` | CORS — nigp.roadmapventure.com |
| `VERCEL_API_BASE` | NIGP frontend URL |

---

## Notes for Claude.ai Design Sessions

When designing features that call external services:
- Anthropic calls → use `ANTHROPIC_API_KEY` (same key, both frontend and backend)
- Supabase reads from client → use `VITE_SUPABASE_*` (public, safe in browser)
- Supabase writes/admin → use `SUPABASE_SERVICE_KEY` (server-side only, never in browser)
- OpenAI → server-side only — never expose `OPENAI_API_KEY` to browser
- Railway backend → always called via `VITE_FETCH_API_URL` from frontend
