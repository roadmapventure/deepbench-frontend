# DeepBench v5 — Product Requirements Document

> Migrated from Google Drive to GitHub: 2026-06-07
> Living document — update when major decisions are made.
> Last Drive update: Session 1 — Architecture & Decisions

---

## 1. Product Overview

**Product name:** DeepBench
**Entry URL:** `deepbench.roadmapventure.com`
**Owner:** John Leonard, Roadmap Venture
**Purpose:** AI workforce platform. Users build a bench of specialized AI
agents, assign them work tasks, and manage output through dashboards.

**Positioning:** DeepBench is the platform. The NIGP Spend Analyzer is the
data analysis engine that lives inside it, reached via a task assignment.

**Prior version:** v4.x lives at `nigp.roadmapventure.com` — preserved as-is.

---

## 2. What v5 Is

v5 = v4.x functionality (fully preserved) + new DeepBench shell, work
dashboard, task flow, and agent workforce UI.

The NIGP analyzer is not replaced — it becomes a destination inside the
platform, scoped to a task at `/work/[taskId]/analyze`.

---

## 3. Architecture Decisions (Locked)

### 3.1 Repos
- Two separate GitHub repos — not a monorepo
- `deepbench-frontend` — React/Vite → Vercel
- `deepbench-backend` — Node.js + Playwright → Railway
- v4 preserved with git tags: `v4.0-production` (frontend), `v4.3.1-backend`

### 3.2 Routing

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

### 3.3 Persistence (Phase 1)
- Supabase `tasks` table — sequential integer IDs
- Supabase Storage bucket `task-data` — uploaded/fetched CSVs
- Column mapping saved as JSONB on task record (`mapping`)
- Instruction steps saved as JSONB on task record (`steps`)
- Analysis re-computed client-side from stored CSV — no result caching
- AI Review briefing output saved as JSONB (`ai_result`)

### 3.4 Auth
- No login screen for Phase 1
- Single hardcoded `CURRENT_USER` constant
- Clerk added when multi-tenancy arrives — replaces one constant

### 3.5 Multi-Tenancy Stubs (Phase 1)
- `tenant_id` column on every Supabase table, defaults to `"global"`
- `CURRENT_USER = { name: "John Leonard", workspace: "Roadmap Venture", tenantId: "global" }`
- `TENANT_ID = "global"` top-level constant
- `useAgents()` hook wrapping static array (swappable for API call later)
- `BASE_URL` constant for shareable links

---

## 4. Database Schema

### tasks table
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
  csv_path     text,
  mapping      jsonb,
  ai_result    jsonb,
  has_hitl     boolean default false,
  steps        jsonb,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
```

### Storage bucket
- Name: `task-data`
- Path: `{tenant_id}/{task_id}/{filename}.csv`
- Public: false (signed URLs)

### Existing tables from v4.x
- `knowledge_entries` — RAG knowledge base
- `agent_configs` — agent role/format prompts
- `agent_run_log` — Brent fetch run history
- All have `tenant_id` column

---

## 5. Agent Roster (Locked)

| ID | Name | Role | Arch | Skill | Cost | Notes |
|----|------|------|------|-------|------|-------|
| JR-01 | Chloe Okafor | Junior Analyst | LLM Prompt | 42 | Free | |
| SR-02 | Mike Alvarez | Senior Analyst | LLM Deep | 67 | $141 | |
| PP-01 | Michelle Manning | Project Planner | Planner | — | — | S-BENCH-01 |
| PR-04 | Bob Whitfield | Professional Analyst | RAG | 78 | $339 | |
| MK-05 | Christy Park | Marketing Designer | LLM Format | 55 | $141 | Add-on |
| CN-03 | Robyn Castellanos | NIGP Consultant | RAG+Deep | 89 | $521 | |
| DR-06 | Brent Matthews | Web Agent | ReAct+Memory | 74 | — | Playwright |
| IR-07 | Pat Smiley | Intern Researcher | None | 12 | Free | isIntern:true |

---

## 6. External Services

| Service | Purpose | Env var |
|---------|---------|---------|
| Anthropic Claude Haiku | Classification, routing, short answers | `ANTHROPIC_API_KEY` |
| Anthropic Claude Sonnet | ReAct loop, briefings, planning | `ANTHROPIC_API_KEY` |
| Supabase | Tasks, RAG, configs, logs, storage | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| OpenAI `text-embedding-3-small` | RAG vector embeddings | `OPENAI_API_KEY` |
| Railway | Node.js + Playwright backend | `PORT`, `ALLOWED_ORIGINS`, `VERCEL_API_BASE` |
| Vercel | Frontend + serverless API | auto-configured |

---

## 7. Design System — Treasury Palette (Locked)

See `src/tokens.js` — never hardcode these values.

```
Background:  #ddd5be (paperDeep)   #f8f2e2 (card)   #f2ead4 (cardAlt)
Navy:        #12243c   #1a2e4a   #0b1929
Brass:       #b6873a   #886224   #e4c786
Moss:        #5a7538   #a6bc82
Flag red:    #a83319
Muted:       #786d52   #58503a
Lines:       #c8bb9a   #d8cbac
```
Fonts: Fraunces (display), Inter (body), JetBrains Mono (labels)
Corner ornaments: 9px brass SVG, absolute positioned on cards.

---

## 8. AI Architecture

### AI Types in Use

| # | Location | Pattern | Purpose |
|---|----------|---------|---------|
| 1 | `api/brief.js` + `api/agent-run.js` | RAG-augmented LLM | Procurement briefing |
| 2 | `src/agent.js` (backend) | ReAct loop | Brent web agent |
| 3 | `api/web-memory.js` GET | Vector similarity | Retrieve past Brent runs |
| 4 | `api/web-memory.js` POST | Online learning / RAG write-back | Brent self-training |
| 5 | `api/extract.js` | Document understanding | PDF/doc text extraction |
| 6 | `computeFlags()` | NOT AI — deterministic rules | Procurement flags |
| 7 | `computeVendorConc()` | NOT AI — algorithmic | HHI scoring |

### AI Call Rules (Locked)
- Haiku for classification, routing, short answers
- Sonnet only for complex reasoning, ReAct loops, long briefings
- Structured output via Claude tool use — never parse free-text JSON
- Every call has explicit `max_tokens`
- Streaming only where UX benefit justifies overhead
- `✦ AI` badge on every AI-touched element — NOT on deterministic logic

### Task Planning Agent (Phase 1)
- Pattern: Plan-and-Execute with async HITL gates
- Generates clarifying questions + step plan simultaneously
- Two-panel UI: conversation left, living plan right
- Plan streams word by word
- HITL detection automatic — no user configuration
- Change log: every removed/modified step archived, never deleted
- Structured output: planning agent returns validated JSON schema

### Chat Panel (Phase 1)
- Consultative agent interface with RAG knowledge
- Intelligent routing (switchboard pattern) — suggests agent switches
- Knowledge tier indicator: Trained / Informed / General
- Answer provenance chips on Tier 1 responses
- "Save as Assignment" affordance on every response

### AI Transparency Layer (app-wide)
- `✦ AI` brass badge on every AI-touched element from Phase 1
- Universal AI status dot — pulsing brass `●` when any call active
- AI Activity Panel — grouped by AI type, cost + count + latency
- Per-step AI execution log → `agent_run_log`

---

## 9. Features — Carried Forward from v4.x

| Feature | v4 file | v5 location |
|---------|---------|------------|
| CSV parsing + column auto-detection | `App.jsx` | `AnalyzerScreen.jsx` |
| NIGP class lookup (264 classes) | `App.jsx` | `nigp-lookup.js` |
| 6 procurement flag algorithms | `computeFlags()` | `flags.js` |
| HHI vendor concentration scoring | `computeVendorConc()` | `analysis.js` |
| All 10 analyzer tabs | `App.jsx` | `/work/[id]/analyze` |
| Team Roster | `TeamBuilder.jsx` | `/bench` |
| Personnel File | `PersonnelScreen.jsx` | `/bench/[agentId]` |
| Teach Agent | `TeachScreen` | `/bench/[agentId]/teach` |
| Test My Team | `TestTeamScreen` | `/bench/test` |
| Brent ReAct agent | `agent.js` | `deepbench-backend` unchanged |
| RAG ingest + query | `api/ingest.js` | carried forward |
| AI briefing pipeline | `api/brief.js` | carried forward |

---

## 10. Features Removed in v5

| Feature | Reason |
|---------|--------|
| `s-landing` marketing page | Belongs on roadmapventure.com |
| `s-casestudy` NIGP case study | Replaced by shareable demo task URL |
| "I'd rather have an intern fetch" link | Pat is first-class roster agent |
| `RagAdmin_v2.jsx` | Superseded by TeamBuilder |
| `nigp-analyzer-fixed.jsx` | Legacy scratch file |

---

## 11. Demo Strategy

Named task pre-loaded:
- **"NIGP Demo — Austin FY2025 Spend Analysis"**
- URL: `deepbench.roadmapventure.com/work/1/analyze`
- Pre-loaded with Austin CSV, all tabs ready
- Shareable link for prospects and demo audiences

---

## 12. Open Questions

- State registry: Texas, California, Florida in backend `stateRegistry.js`
  shown as "Coming Soon" — wire up or remove?
- Departments tab: confirm it appears in v5 analyzer sidebar
- `agent_run_log` — confirm `tenant_id` column exists or needs migration
