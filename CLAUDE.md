# DeepBench Frontend — Project Intelligence

## Project Overview

DeepBench v5.1.x is an AI agent workforce platform that helps government procurement teams automate work activities, store domain knowledge, and analyze procurement strategy based on real spend data. Targeted at procurement directors, CPOs, and government agencies.

**Live URL:** https://deepbench.roadmapventure.com

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Hosting | Vercel |
| Database | Supabase (PostgreSQL + pgvector) |
| AI | Anthropic Claude (Haiku for routing/planning, Sonnet for agents) |
| Embeddings | OpenAI text-embedding-3-small |
| Backend | Railway — Node.js (deepbench-backend) |
| CSV Parsing | PapaParse (client-side) |

## Design System — Treasury

**Colors:**
- `brass` `#b6873a` — primary accent, AI indicators, CTAs
- `navy` `#12243c` — headers, backgrounds, authority
- `paperDeep` `#ddd5be` — page background
- `moss` `#5a7538` — success, trainable agents, approvals
- `flagRed` `#a83319` — alerts, HITL required, compliance flags

**Typography:**
- `Fraunces` — display/headings (serif, editorial)
- `Inter` — body text
- `JetBrains Mono` — labels, codes, metadata, monospace UI

Import from `src/tokens.js`. Never hardcode colors or fonts in component files.

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — deploys to Vercel automatically |
| `dev` | Staging — integration branch |
| `feature/[ID]-[name]` | Per-session feature branches (e.g. `feature/S01-tagging-and-overlay`) |

PRs go `feature → dev → main`. Never commit directly to `main` or `dev`.

## File Version Header Standard

Every `.jsx` and `.js` file in `src/` must have this as its **first line**:

```js
// DeepBench v5.1.0 | [filename] | [brief description]
```

Example:
```js
// DeepBench v5.1.0 | DashboardScreen.jsx | Work dashboard — task list, stats, chat panel
```

## Feature ID Standard

Every major component, tab, panel, and function block gets a comment tag immediately before the relevant code:

```jsx
{/* FEATURE: DB-07 — Chat panel topic pills */}
```
```js
// FEATURE: SH-06 — Supabase tasks integration
```

See the Feature ID Reference Map below for the full ID list.

## Feature ID Reference Map

### Shell (SH)
| ID | Location |
|----|---------|
| SH-01 | `src/tokens.js` |
| SH-02 | `src/config.js` |
| SH-03 | `src/hooks/useAgents.js` + `src/data/agents.js` |
| SH-04 | `src/main.jsx` — all routes |
| SH-05 | `src/AppShell.jsx` — header, nav tabs, AI dot, activity panel trigger, help modal |

### Dashboard (DB)
| ID | Feature |
|----|---------|
| DB-01 | Task list |
| DB-02 | Stats strip |
| DB-03 | Show more drawer |
| DB-04 | Recently completed |
| DB-05 | Awaiting-input status |
| DB-06 | Assign New Work button |
| DB-07 | Chat topic pills |
| DB-08 | Chat direct agent pills |
| DB-09 | AI routing/switchboard |
| DB-10 | Knowledge tier badge |
| DB-11 | Provenance chips |
| DB-12 | General knowledge disclaimer |
| DB-13 | Save as Assignment |
| DB-14 | Live RAG + AI call |
| DB-15 | NIGP demo task pre-load |

### Assign Work (AW)
| ID | Feature |
|----|---------|
| AW-01 | Task type tiles |
| AW-02 | Free-form goal input |
| AW-03 | Two-panel layout |
| AW-04 | Planning agent clarifying questions |
| AW-05 | Step plan generation |
| AW-06 | Agent suggestion + brass glow |
| AW-07 | Agent swap + dynamic replanning |
| AW-08 | Change log collapsible |
| AW-09 | Save draft awaiting-input |
| AW-10 | Persistent save state indicator |
| AW-11 | Approve Plan & Launch button |
| AW-12 | Pre-populate from chat (from=chat param) |
| AW-13 | Chat transcript shown in task |

### Task Instructions (TI)
| ID | Feature |
|----|---------|
| TI-01 | Step timeline |
| TI-02 | HITL step navigation |
| TI-03 | Step history from Supabase |
| TI-04 | Inline step editing |
| TI-05 | Re-run All button |
| TI-06 | Mark Complete button |
| TI-07 | Chat transcript section |
| TI-08 | View Brent CTA |

### Analyzer (AZ)
| ID | Feature |
|----|---------|
| AZ-01 | CSV upload + PapaParse |
| AZ-02 | Column mapping screen |
| AZ-03 | Column mapping saved to Supabase |
| AZ-04 | CSV upload to Supabase Storage |
| AZ-05 | CSV load from Supabase Storage |
| AZ-06 | Tab: Dashboard/Overview |
| AZ-07 | Tab: Categories |
| AZ-08 | Tab: Treemap |
| AZ-09 | Tab: Vendors |
| AZ-10 | Tab: Departments |
| AZ-11 | Tab: Timeline |
| AZ-12 | Tab: Concerns/Flags |
| AZ-13 | Tab: Local Spend |
| AZ-14 | Tab: Vendor Diversity/HHI |
| AZ-15 | Tab: AI Review |
| AZ-16 | Tab: Cleanup |
| AZ-17 | Tab: Full Table |
| AZ-18 | Austin demo pre-load |

### Fetch (FT)
| ID | Feature |
|----|---------|
| FT-01 | Fetch config |
| FT-02 | SSE connection to Railway |
| FT-03 | Agent running screen |
| FT-04 | Post-fetch download + analyze button |
| FT-05 | CSV save to Supabase Storage |
| FT-06 | Pat selectable as fetch agent |

### Roster (RO)
| ID | Feature |
|----|---------|
| RO-01 | All 7 agents |
| RO-02 | Agent cards + workload |
| RO-03 | Add a Player button |

### Personnel (PE)
| ID | Feature |
|----|---------|
| PE-01 | Profile tab |
| PE-02 | Resume tab |
| PE-03 | Training tab |
| PE-04 | Playbook tab |
| PE-05 | Workflow tab stub |
| PE-06 | Projects tab stub |

### Teach (TC)
| ID | Feature |
|----|---------|
| TC-01 | Upload + ingest + RAG |

### Test Team (TT)
| ID | Feature |
|----|---------|
| TT-01 | Multi-agent query runner |
| TT-02 | Prompt comparison/diff |

### AI Layer (AI)
| ID | Location |
|----|---------|
| AI-01 | `SharedUI.jsx` — AiBadge component |
| AI-02 | `AppShell.jsx` + `useAIStatus.js` — universal AI status dot |
| AI-03 | `AIActivityPanel.jsx` — activity panel |
| AI-04 | `DashboardScreen` — intelligent agent routing |
| AI-05 | `AssignWorkScreen` — planning agent structured output |
| AI-06 | `DashboardScreen` — semantic similarity score |
| AI-07 | `web-memory.js` — synthesis logging |
| AI-08 | `backend/src/agent.js` — Brent ReAct agent |
| AI-09 | `api/ingest.js` + `api/rag-query.js` — RAG pipeline |

## Key Architectural Decisions

- **No hardcoded selectors** — agents learn through training, not brittle CSS/XPath selectors
- **Deterministic + AI split** — deterministic code handles known fields; AI handles unknown elements
- **Client-side CSV processing** — PapaParse runs in browser; no client data stored or transmitted (HIPAA/compliance advantage)
- **Single-shot LLM calls** — most use cases use one call; agentic multi-step only when step N+1 depends on step N output
- **No two-model arbitration** — avoid using two LLMs to check each other; use deterministic grounding checks instead
- **RAG before LLM** — always retrieve relevant knowledge chunks before calling the model; inject as Layer 02

## Agent Roster

| Agent | Code | Architecture | Notes |
|-------|------|-------------|-------|
| Brent Matthews | DR-06 | RAG + Web Agent | Self-learning, government portal specialist |
| Pat Smiley | IR-07 | No Training | Intern, no memory, demo only |
| Chloe Okafor | JR-01 | LLM Prompt | Junior analyst, fast/obvious tasks |
| Mike Alvarez | SR-02 | LLM Deep Prompt | Senior, industry best-practice |
| Bob Whitfield | PR-04 | RAG | Legal & compliance, trainable |
| Christy Park | MK-05 | LLM Format | Marketing/formatting |
| Robyn Castellanos | CN-03 | RAG + Deep Prompt | NIGP consultant, highest skill |

## Supabase Schema

**Tables:**
- `tasks` — work assignments with status, agent, tenant
- `steps` — JSONB step arrays per task
- `agent_configs` — per-agent prompt layer configuration
- `knowledge_entries` — RAG training documents (with embeddings)
- `agent_run_log` — AI call audit trail

**Storage:**
- Bucket: `task-data/{tenant}/{taskId}/file.csv`

## Railway Backend

**Service:** `deepbench-backend`
- Brent ReAct web agent (Playwright + Claude Sonnet)
- SSE streaming for live agent events
- `stateRegistry` for run state management
- Env var: `VITE_FETCH_API_URL` → Railway URL

## Build & Deploy Rules

1. Always run `npm run build` before committing — **zero build errors required**
2. Never commit `.env` files or API keys
3. Vercel auto-deploys `main` branch; `dev` branch has preview deployments
4. All feature work on `feature/[ID]-[name]` branches; PR to `dev` first
