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
| `GATE_BYPASS_SECRET` | Edge gate bypass for QA tooling (`HAR-33`). A request to `/api/*` carrying header `x-db-gate-bypass: <this value>` skips `middleware.js`'s per-IP access gate entirely, so Claude QA scripts and the regression drivers keep working against an IP that is capped or blocked. **Where set:** Vercel project env, all environments (production / preview / development) — value lives only in the Vercel dashboard, never in this repo, a kickoff doc, or a log line. Unset ⇒ the bypass is inert (an empty header can never match), never an open door. | dev/QA |
| `IPINFO_TOKEN` | ipinfo.io token for the caller IP→org lookup (`lib/ip-org-resolver.js`, `LOG-121`). **Optional by design** — absent, the resolver uses the anonymous tier, which is sufficient at this volume. A missing token must degrade to the anonymous endpoint, never to an error, so this is never a required var. Each distinct IP is resolved exactly once ever (`ip_org_cache`), so steady-state usage is zero requests. | optional |

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

## Local Claude Code Tooling (not a deployed-app env var)

| Variable | Purpose | Where it lives |
|----------|---------|-----------------|
| `VERCEL_TOKEN` | Auth for the Vercel CLI (`vercel logs`, `vercel inspect`), so a Claude Code session can pull real function logs itself instead of asking John to check the dashboard. Read automatically by the CLI — never passed as a `--token` flag or typed into a prompt. | Persistent Windows environment variable on John's machine only — **not** in this repo, `.env.local`, or any Vercel/Railway dashboard. Added 2026-07-16. |

If a session's shell doesn't see it (`echo $VERCEL_TOKEN` empty in Bash), that session's process likely started before the variable was set — see `CLAUDE-DESIGN.md` Step 5b for the fallback.

---

## Notes for Claude.ai Design Sessions

When designing features that call external services:
- Anthropic calls → use `ANTHROPIC_API_KEY` (same key, both frontend and backend)
- Supabase reads from client → use `VITE_SUPABASE_*` (public, safe in browser)
- Supabase writes/admin → use `SUPABASE_SERVICE_KEY` (server-side only, never in browser)
- OpenAI → server-side only — never expose `OPENAI_API_KEY` to browser
- Railway backend → always called via `VITE_FETCH_API_URL` from frontend
