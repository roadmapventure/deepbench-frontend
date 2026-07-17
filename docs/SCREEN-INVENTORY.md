# DeepBench — Screen & Platform-Layer Inventory

> Confirmed with John 2026-07-15 across two design conversations (not coding sessions — no code changed to produce this doc). Source of truth for the new feature-ID taxonomy: **Screens** (this file's first half, Product Focus Area → Screen → Child Screen, built from `src/main.jsx`/`src/AppShell.jsx`) plus **Platform Layers** (the second half — backend/architectural concerns that cut across every screen, not tied to any one of them).
>
> **This is now the active ID format, not a draft.** New feature/bug IDs use `[SCREEN-CODE]-[NUMBER]` or `[PLATFORM-LAYER-CODE]-[NUMBER]` from here on. **Applies prospectively only** — the ~250 existing `[AREA]-[NUMBER]` IDs (`MI-71`, `AA-191`, etc.) are not renamed; they keep meaning what they've always meant. `docs/FEATURES.md`'s "Feature ID Format" section points here for anything logged from now on.
>
> **Type stays a separate column, deliberately not baked into the ID.** Screen/layer is a stable fact; Type is a judgment call that can shift mid-investigation — baking it into a permanent ID creates exactly the rename-and-broken-cross-reference risk this whole redesign exists to avoid (see the `dev_version_counter` fix for the same lesson applied to version numbers).
>
> **Renamed 2026-07-17 (John, live design conversation) — "Product Area" is now "Product Focus Area."** Same concept, sharper name — matches `ARCHITECTURE.md` §1's rewritten 5-layer model, where this is the "Product Focus Area" layer (the HITL-facing dashboards; briefly called "Environment" the same day, fully retired — that word doesn't apply anymore, see §1's own note). See `ARCHITECTURE.md` §1 for the full layer model this taxonomy now plugs into.

---

## The real structure: Product Focus Area → Screen → (sometimes) Child Screen

Not a flat list — every top-level nav destination is a **Product Focus Area**, most containing more than one **Screen**. A "conflict" between two names for the same thing (e.g. `Bench` vs `Agent Roster`) usually isn't a conflict at all — it's the Product Focus Area name and the Screen name, which are allowed to differ on purpose.

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
| Agent Roster | `/bench` | `RosterScreen.jsx` | Add Agent, Personnel File | "Bench" is the Product Focus Area/nav-tab name (locked, `RO-12`); "Agent Roster" is this specific screen's name (the on-screen headline) — both correct, different levels. |
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
| `DAT` | **Data model, Supabase schema/migration work, and seeding** — added 2026-07-15. Scoped to the *data* layer (`the_library`, `data_rooms`, `deliverables`, `ai_activity_log` schema) — **not** Skill Profile/Capability content (`skill_profiles.objective`/`.output_desc` edits stay Competency Model even though both are mechanically Supabase writes; the distinction is subject matter, not mechanism). | New, was scattered across `AA` (Continuity/Data types) | e.g. a stray test-debris row archived in `the_library`; a real RPC migration adding a missing column to `match_the_library`'s `RETURNS TABLE`. |
| `AGT` | **Agent Competency Model** — replaces `AG`/`SK`/`IN`/`FM` with one unified code, decided 2026-07-15 in `S-ARCH-COMPETENCY-MODEL-design` (`docs/AGENT-COMPETENCY-MODEL.md`). Deliberate correction, not just a convenience: the four-way split reflected the stale, pre-reconciliation model (`INTENT-MODEL.md`/`FORMAT-MODEL.md`, both superseded) that treated Intent and Format as separate first-class entities. This session established they're two of five (now six, pending confirmation) Skill *types* on one entity — Identity/Behavior/Knowledge/Intent/Format/Guardrails — not separate domains, so one code covering all 6 Agent Competency Model tables (`skill_profiles`, `skill_types`, `capabilities`, `capability_skill_profiles`, `agent_capability_assignments`, `agent_configs`, plus `agents` itself) is the correct reflection of the model, same precedent as `LOO` covering the whole delegation mechanism as one topic rather than several. **Widened 2026-07-17 (John, live design conversation):** `AGT` also covers `knowledge_entries` (an agent's own personal training corpus, RAG-backed, populated via the Teach flow) — confirmed as one conceptual entity with the structured tables above, not a separate thing: an agent's competency is both its assigned Skills/Capabilities *and* its own uploaded training content, together (John's example: an NIGP spend-consultant agent's certification is both). See `ARCHITECTURE.md` §1's "Data Model — Competency" for the full reasoning. | `AG`/`SK`/`IN`/`FM` | Confirmed, first rows: `AGT-001` onward. |
| `SES` | **Session process / meta-work** — added 2026-07-17. For work about *how sessions operate* (architecture-doc structure, naming conventions, session-hygiene rules, cross-reference indexes) rather than a product feature or bug. Not a Screen or a product-facing Platform Layer — deliberately distinct from `PRO` (Project Management screen) to avoid exactly the kind of collision this taxonomy exists to prevent. | New | First rows: `SES-001` onward (see `docs/FEATURES.md`). |
| `MOB` | **Mobile-parity work** — added 2026-07-17. **Deliberate exception to this taxonomy's own "ID = where, Type = what" principle** — mobile isn't a Screen or a Platform Layer, it's a device context that cuts across all of them. Given a dedicated ID series anyway, by John's explicit request, so mobile-parity fixes can be tracked and prioritized as a single bucket rather than scattered as a Type tag across every Screen's rows: "It helps me prioritize - I consider fixes for it as a single entity, and then each one I can flag the bucket." Populated by the Desktop/mobile parity check in `CLAUDE-DESIGN.md` Step 4 — logged here only when a mobile-side fix needs real design work and can't just be folded into the same session as the matching desktop fix. | New | First rows: `MOB-001` onward (see `docs/FEATURES.md`). |

`AA` had 192 rows total (by far the largest bucket) before this split — confirms `HAR`/`LOO` were doing real, distinct work under one name, not a false distinction. **As of 2026-07-15, no code in this taxonomy is still "deferred" — `AGT` was the last open one.**

---

## Applied: every row currently in `docs/FEATURES.md`, translated

**Snapshot as of 2026-07-15, 42 rows.** Read individually, not prefix-mapped — old prefix didn't reliably predict the new bucket (several `AA` rows turned out to be Competency Model content, not harness/loop). **This will drift as `FEATURES.md` changes** — treat as a starting point for conversation, re-verify a specific row's classification before treating it as certain if it's been a while since 2026-07-15, don't blindly trust it forever.

| Old ID | Type | New bucket |
|---|---|---|
| `MI-03` | Feature | `CHI` |
| `MI-41` | UI | `CHI` |
| `MI-53` | Architecture | `CHI` *(blocked on `AA-191`/`LOO`)* |
| `MI-69` | Architecture | `CHI` |
| `AA-153` | Task Success Rate | `CHI` |
| `TI-16` | Feature | `PRO` |
| `AA-178` | Architecture | `LOO` |
| `AA-179` | Architecture | `LOO` |
| `AA-90` | Architecture | `LOO` |
| `AA-99` | Architecture | `LOO` |
| `AA-140` | Task Success Rate | `LOO` |
| `AA-151` | Task Success Rate | `LOO` |
| `AA-151b` | Task Success Rate | `LOO` |
| `AA-159` | Speed | `LOO` |
| `AA-185` | Task Success Rate | `LOO` |
| `AA-187` | Task Success Rate | `LOO` |
| `AA-191` | Architecture | `LOO` |
| `AA-175` | Observability | `HAR` |
| `AA-170` | Speed | `HAR` |
| `AA-121` | Speed | `HAR` |
| `AA-146` | Task Success Rate | `HAR` |
| `AA-169` | Architecture | `HAR` |
| `AA-156` | Task Success Rate | `HAR` |
| `AA-177` | Architecture | `LOG` |
| `AA-190` / `AA-192` | Observability | `LOG` *(code lives in harness files, purpose is logging — boundary case, see table above)* |
| `AI-46` | Observability | `LOG` *(its own proposed fix includes a schema migration — `DAT` overlap once built)* |
| `AI-52` | Observability | `LOG` |
| `AI-53` | Observability | `LOG` |
| `AA-172` | Data | `DAT` |
| `AA-155` | Task Success Rate | `DAT` *(real RPC migration — moved here after the DAT scope clarification)* |
| `AA-181` | Architecture | `AGT` *(finalized 2026-07-15 — was "Competency Model, deferred," now confirmed since `S-ARCH-COMPETENCY-MODEL-design` landed `AGT`)* |
| `AA-182` | Task Success Rate | `AGT` |
| `AA-180` | Architecture | `AGT` |
| `AA-174` | Task Success Rate | `AGT` |
| `AA-133` | Speed | `AGT` |
| `AA-167` | Task Success Rate | `AGT` |
| `AA-186` | Architecture | `AGT` |
| `AA-161` | Task Success Rate | `AGT` |
| `AI-45` | Task Success Rate | `AGT` |
| `AA-173` | Task Success Rate | **Unclassified** — a broad test/verification session spanning multiple buckets, not itself one thing |
| `AA-168` | Task Success Rate | **Unclassified** — two distinct bugs in one row, one `AGT`-shaped, one `HAR`-shaped |
| `AA-194` | Task Success Rate | **Worth checking with the other session** — new row, logged as `AA-194` (legacy prefix) despite being about `output_desc` authoring across the roster, which reads as `AGT` territory by content. Straddles two categories by its own text (complementary to `AA-191`/`LOO`) — not silently recoding it, flagging for you to confirm with that session. |
| `AGT-001` | Task Success Rate | Already `AGT` — logged directly in the new format by `S-ARCH-COMPETENCY-MODEL-design` itself. |
| `AA-160` | Task Success Rate | **Unclassified** — not yet root-caused, can't classify what isn't diagnosed |
