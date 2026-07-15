# DeepBench — Screen & Platform-Layer Inventory

> Confirmed with John 2026-07-15 across two design conversations (not coding sessions — no code changed to produce this doc). Source of truth for the new feature-ID taxonomy: **Screens** (this file's first half, Product Area → Screen → Child Screen, built from `src/main.jsx`/`src/AppShell.jsx`) plus **Platform Layers** (the second half — backend/architectural concerns that cut across every screen, not tied to any one of them).
>
> **This is now the active ID format, not a draft.** New feature/bug IDs use `[SCREEN-CODE]-[NUMBER]` or `[PLATFORM-LAYER-CODE]-[NUMBER]` from here on. **Applies prospectively only** — the ~250 existing `[AREA]-[NUMBER]` IDs (`MI-71`, `AA-191`, etc.) are not renamed; they keep meaning what they've always meant. `docs/FEATURES.md`'s "Feature ID Format" section points here for anything logged from now on.
>
> **Type stays a separate column, deliberately not baked into the ID.** Screen/layer is a stable fact; Type is a judgment call that can shift mid-investigation — baking it into a permanent ID creates exactly the rename-and-broken-cross-reference risk this whole redesign exists to avoid (see the `dev_version_counter` fix for the same lesson applied to version numbers).

---

## The real structure: Product Area → Screen → (sometimes) Child Screen

Not a flat list — every top-level nav destination is a **Product Area**, most containing more than one **Screen**. A "conflict" between two names for the same thing (e.g. `Bench` vs `Agent Roster`) usually isn't a conflict at all — it's the Product Area name and the Screen name, which are allowed to differ on purpose.

### Home
| Screen | Route | Component | Status |
|---|---|---|---|
| Home Screen | `/` *(not yet — see note)* | not built yet | ❌ Missing, tracked as `LA-01` (`docs/FEATURES-LATER.md`) |

Splash, announcements, and overall dashboard metrics. `Channel Intelligence` (below) currently occupies `/` temporarily — it needs its own route once Home Screen is built. Not scoped yet.

### Work — a family of dashboards, one per work-type
| Screen | Route | Component | Children | Notes |
|---|---|---|---|---|
| Channel Intelligence | `/` *(temporary — see Home above)* | `MarketIntelligenceScreen.jsx` | — | Renamed from "Market Intelligence," then from the interim "Channel Sales Intelligence" (`MI-46`). Filename never updated to match — that's normal, expected to lag. |
| Project Management | `/work` | `DashboardScreen.jsx` | Create Work Order, Task Instructions | Filename says "Dashboard" — nav label is the canonical name. |
| Spend Analysis | `/work/:taskId/analyze` | `AnalyzerScreen.jsx` | Fetch *(uncertain, see below)* | Filename/legacy prefix (`AZ`) reflect NIGP-analyzer heritage — nav label is canonical. |
| Create Work Order | `/work/new` | `CreateWorkOrderScreen.jsx` | — | Always a child of Project Management. |
| Task Instructions | `/work/:taskId` | `TaskInstructionsScreen.jsx` | — | Always a child of Project Management. |

More dashboards expected here over time as new work-types are built — this list isn't meant to be closed.

### Bench
| Screen | Route | Component | Children | Notes |
|---|---|---|---|---|
| Agent Roster | `/bench` | `RosterScreen.jsx` | Add Agent, Personnel File | "Bench" is the Product Area/nav-tab name (locked, `RO-12`); "Agent Roster" is this specific screen's name (the on-screen headline) — both correct, different levels. |
| Add Agent | `/bench/new` | `BenchNewScreen.jsx` | — | Always a child of Agent Roster. |
| Personnel File | `/bench/:agentId` | `PersonnelScreen.jsx` | Teach | Always a child of Agent Roster. |
| Teach | `/bench/:agentId/teach` | `TeachScreen.jsx` | — | Always a child of Personnel File — one level deeper than Add Agent/Personnel File, not a sibling of them. |
| Test My Team | `/bench/test` | `TestTeamScreen.jsx` | — | **Placement uncertain** — likely a NIGP-era leftover not yet fully incorporated into DeepBench's own model. Sits directly under Bench (not nested) for now; revisit later. |

### Platform — overlay panels, not routes
| Screen | Component | Reached via |
|---|---|---|
| AI Audit | `AIActivityPanel.jsx` | Hamburger/nav → Platform → AI Audit |
| About DeepBench | `AboutPanel.jsx` | Hamburger/nav → Platform → About |

---

## Open items

- **`Fetch`** (`/work/:taskId/fetch`, `FetchScreen.jsx`) — placed under Spend Analysis above on route-pattern inference (matches Task Instructions'/Spend Analysis's own `/work/:taskId/...` shape), but John flagged this as a probable NIGP leftover not fully incorporated — not a confirmed placement.
- **Home Screen** itself and **Channel Intelligence's move off `/`** both need their own scoping/design sessions — tracked at `LA-01`, `docs/FEATURES-LATER.md`.

---

## Platform Layers — not screens, cut across all of them

Confirmed 2026-07-15, based on real usage counts across `FEATURES.md`/`FEATURES-NEXT.md`/`FEATURES-LATER.md`/`FEATURES-ARCHIVE.md` (checked before naming anything, not guessed from the old legend's one-line descriptions).

| Code | Layer | Was | Real content (spot-checked) |
|---|---|---|---|
| `HAR` | **Harness** — the shared generic execution pipeline itself (`execute.js`, `db-assembly.js`, `ai-enrichment.js`, `request-receivable.js`) | Part of `AA` | e.g. `AA-190`: consolidating scattered `ai_activity_log` write sites into one shared service. |
| `LOO` | **Loop** — the agent-to-agent delegation mechanism specifically (`request_help`/`delegate_to_agent`, `durable_hops` checkpoint/resume) | Part of `AA` | e.g. `AA-191` (write-bypass gap), `AA-185`/`AA-187` (duplicate/orphaned delegation events). |
| `LOG` | **AI Audit / activity log** — logging, tracing, `SERVICE_CATALOG`/`PATTERN_CATALOG` naming | `AI` | Every row checked was `Observability`-typed: trace-ID grouping, `patterns_used` tracking, service-naming collisions. |
| `MCP` | **MCP protocol exposure** — services exposed as MCP tools | Part of `SV` | The one real `SV` row about this: `deepbench/{intent}/{format}` tool path exposure. |
| `MKT` | **Service Marketplace** — catalog, service profile pages, browse/purchase flow (Phase 4 roadmap, currently 100% unbuilt) | Part of `SV` | The other three `SV` rows: service catalog registry, profile view, marketplace listing. |

`AA` had 192 rows total (by far the largest bucket) before this split — confirms `HAR`/`LOO` were doing real, distinct work under one name, not a false distinction.

**Not decided here — deferred to a separate, already-in-progress session** (`S-ARCH-COMPETENCY-MODEL-design`, `docs/AGENT-COMPETENCY-MODEL.md`, DRAFT as of 2026-07-15): `AG` (Agent Identity), `SK` (Skills & Capabilities), `IN` (Intent), `FM` (Format). That session is reconciling these directly against the locked `ARCHITECTURE.md` §2 hierarchy (Technical Services → Skills → Skill Profiles → Capabilities → Competencies → Agents) with real per-agent completeness data — don't guess a replacement naming here before that lands.
