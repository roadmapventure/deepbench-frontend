# DeepBench — Screen Inventory

> Draft, confirmed with John 2026-07-15 in a design conversation (not a coding session — no code changed to produce this doc). Source of truth for "what screens exist and what do we call them" going forward. Built directly from `src/main.jsx` (routes) and `src/AppShell.jsx` (nav), not from the existing `FEATURES.md`/`FEATURES-ARCHIVE.md` area-prefix legend — that legend mixes real screens with backend/platform layers (see "Not screens" at the bottom) and has known naming mismatches this doc exists to resolve.

> **This does not replace the area-prefix legend yet.** That's a separate, not-yet-made decision (feature-ID format redesign — this inventory is the taxonomy it would build on, if John goes that direction). Until then, `FEATURES.md`'s existing `[AREA]-[NUMBER]` IDs are still what's actually used.

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

## Not screens — current area prefixes that don't map to anything in this inventory

`AI` (AI Infrastructure), `AG` (Agent Identity), `SK` (Skills & Capabilities), `SV`/`FM`/`IN` (Service/Format/Intent), `AA` (Agent Architecture) are backend/platform layers that cut across every screen above, not a place on this map. If a future ID scheme goes "by screen," these need their own non-screen bucket — forcing them into a screen they don't belong to would misrepresent them the same way the old `DB`=Dashboard / actual-name-Project-Management mismatch did.
