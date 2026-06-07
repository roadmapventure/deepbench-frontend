# DeepBench v5 — Architecture Reference

> Locked decisions are marked **[LOCKED]**. Do not change without explicit product approval.

---

## Repos

Two separate GitHub repos — **not a monorepo.** [LOCKED]

| Repo | Tech | Deploy |
|------|------|--------|
| `roadmapventure/deepbench-frontend` | React + Vite | Vercel → `deepbench.roadmapventure.com` |
| `roadmapventure/deepbench-backend` | Node.js + Playwright | Railway |

Branch strategy: `main` = production, `dev` = staging. Commit directly to `dev`. No feature branches during active development. **Merge `dev → main` only when John explicitly confirms.**

---

## Routing

| URL | Screen |
|-----|--------|
| `/` | DeepBench work dashboard |
| `/work/[taskId]/analyze` | NIGP analyzer scoped to a task |
| `/bench` | Team roster |
| `/bench/[agentId]` | Personnel file |
| `/work/new` | Assign new work |
| `/work/[taskId]` | Task instructions / step detail |

Three access paths to the analyzer:
1. Dashboard → click task card
2. Task instructions screen → "View Analysis" button
3. Direct URL (bookmarkable, shareable)

---

## Persistence [LOCKED]

- Supabase `tasks` table — sequential integer IDs
- Supabase Storage bucket `task-data` — uploaded/fetched CSVs
- Column mapping saved as JSONB on task record (`mapping`)
- Instruction steps saved as JSONB on task record (`steps`)
- Analysis re-computed client-side from stored CSV — no result caching [LOCKED]
- AI Review briefing output saved as JSONB on task record (`ai_result`)

---

## Auth

No login screen for Phase 1. Single hardcoded constant: [LOCKED]
```js
const CURRENT_USER = { name: "John Leonard", workspace: "Roadmap Venture", tenantId: "global" }
```
Clerk added when multi-tenancy arrives — replaces one constant.

---

## Multi-Tenancy Stubs (Phase 1 — functional later)

- `tenant_id` column on every Supabase table, defaults to `"global"`
- `TENANT_ID = "global"` top-level constant in `src/config.js`
- `BASE_URL` constant for shareable links
- `useAgents()` hook wrapping static array (swappable for API call later)

---

## Database Schema

### `tasks` table

```sql
create table tasks (
  id           serial primary key,
  tenant_id    text not null default 'global',
  title        text not null,
  agent_id     text not null,
  type         text not null,
  status       text not null default 'pending',
  priority     text not null default 'Normal',
  due          text,
  preview      text,
  csv_path     text,       -- Supabase Storage path
  mapping      jsonb,      -- column mapping selections
  ai_result    jsonb,      -- AI Review briefing output
  has_hitl     boolean default false,
  steps        jsonb,      -- instruction step array
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
```

### Storage bucket

- Bucket: `task-data` (private, signed URLs)
- Path: `{tenant_id}/{task_id}/{filename}.csv`

### Existing tables (carried from v4.x)

- `knowledge_entries` — RAG knowledge base
- `agent_configs` — agent role/format prompts (Michelle's prompt lives here)
- `agent_run_log` — Brent fetch run history
- All have `tenant_id` column

---

## External Services

| Service | Purpose | Env var |
|---------|---------|---------|
| Anthropic Claude Haiku | Classification, routing, short answers | `ANTHROPIC_API_KEY` |
| Anthropic Claude Sonnet | Briefings, ReAct loop | `ANTHROPIC_API_KEY` |
| Supabase | Tasks, RAG, agent configs, run logs, CSV storage | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| OpenAI `text-embedding-3-small` | RAG vector embeddings | `OPENAI_API_KEY` |
| Railway | Persistent Node.js + Playwright backend | `PORT`, `ALLOWED_ORIGINS`, `VERCEL_API_BASE` |
| Vercel | Frontend + serverless API functions | auto-configured |

---

## AI Architecture

### AI Call Rules [LOCKED]

| Rule | Detail |
|------|--------|
| Model selection | Haiku: classification, routing, short answers. Sonnet: complex reasoning, ReAct loops, long briefings. Never Sonnet where Haiku suffices (~20x cost). |
| Structured output | Use Claude tool use / `response_format`. **Never parse free-text JSON.** |
| Token budgeting | Every call has explicit `max_tokens`. Uncapped calls balloon cost. |
| Streaming | Only where UX benefit justifies overhead. Yes: task planning, AI Review. No: routing, classification. |
| Prompt caching | System prompts that don't change use Anthropic prompt caching. |
| RAG retrieval | Cap `match_count` on vector searches. Do not uncap. |

### AI Types in Use

| # | Location | Pattern | Purpose |
|---|----------|---------|---------|
| 1 | `api/brief.js` + `api/agent-run.js` | RAG-augmented LLM | Procurement briefing |
| 2 | `src/agent.js` (backend) | ReAct loop | Brent web agent |
| 3 | `api/web-memory.js` GET | Vector similarity search | Retrieve past Brent runs |
| 4 | `api/web-memory.js` POST | Online learning / RAG write-back | Brent self-training |
| 5 | `api/extract.js` | Document understanding | PDF/doc text extraction |
| 6 | `computeFlags()` | **NOT AI** — deterministic rules | Procurement flags |
| 7 | `computeVendorConc()` | **NOT AI** — algorithmic | HHI scoring |

### AI Badge Rule

`✦ AI` badge on every AI-touched UI element.
Deterministic logic (`computeFlags`, HHI, column detection, NIGP lookup) does **NOT** get the badge. This distinction is intentional product positioning.

---

## Michelle Manning — Special Rules [LOCKED]

- PP-01, Project Planner
- System prompt lives in Supabase `agent_configs` — NOT in code
- `api/plan.js` and `api/title.js` read Michelle's prompt from Supabase
- Fully trainable via Teach + RAG pipeline
- Michelle stub until S-BENCH-01: `const MICHELLE = { name: "Michelle Manning", code: "PP-01", initials: "MM" }`
- **Do not add Michelle to `agents.js` until S-BENCH-01**

---

## Step State Architecture [LOCKED]

Three named operations — do not create variations:

```
initializeStepsFromSupabase()    — direct set, no mergeSteps
initializeStepsFromFirstPlan()   — mergeSteps([], new, [])
updateStepsFromPlan()            — mergeSteps(active, new, archived)
```

- `mergeSteps()` = single source of truth for step state
- `saveStepsToSupabase()` = writes full array including archived
- `pendingArchive` preserved in all writes; stripped only on user approve
- Answers persisted on `step.questions[n].a` — never ephemeral state
- `stepsContext` for LLM strips `mergeStatus`, `pendingArchive`, `title_edited`
- `task.steps` set to `mergedToSet.active` after Update Plan

### Step Color Coding [LOCKED]

| Step type | Color |
|-----------|-------|
| Agent | Brass `#b6873a` left border |
| HITL | Flag red `#a83319` |
| Sub-agent | Blue |
| Archived | Grey, collapsible drawer |
| New (post-regen) | Brass `#b6873a` |

Colors must be preserved through every plan regeneration cycle.

---

## Pat the Intern — Behavior [LOCKED]

- First-class roster agent (not a footnote link)
- Selectable for Web Fetch tasks
- `isIntern: true`, no memory, no RAG, skill 12, free
- Never receives auto-training from Brent's web-memory save
- Runs same Railway backend as Brent with `skipRag=true`
- No "I'd rather have an intern fetch" link anywhere in app

---

## v4 Preservation

v4.x lives at `nigp.roadmapventure.com` — **preserved as-is, not modified.**
Tagged on GitHub: `v4.0-production` (frontend), `v4.3.1-backend` (backend).
The NIGP analyzer is not replaced — it becomes a destination inside DeepBench via `/work/[taskId]/analyze`.
