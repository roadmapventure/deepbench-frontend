# DeepBench — Current State
> Updated at the close of every session. **Keep this file short.** Only the current version, the next session, and the last 3 sessions (one line each) belong here. Full session history lives in `docs/SESSIONS.md` — read it only when you need version history or root-cause context from a past session, never by default.

**Version in dev:** v6.0.0

**Next session:** S-ARCH-LOOP-PATCH-01 — patch `S-ARCH-AGENT-LOOP-01`'s harness (`AA-87`/`AA-83`): kickoff written 2026-07-02, `docs/kickoffs/v6.0.0-S-ARCH-LOOP-PATCH-01-agent-loop-harness-patch.md`. Removes `executing_agent_id`/`critique_agent`; two harness-generic tools (`request_help`, `delegate_to_agent`), no fast path — every `request_help` call always routes to whoever holds `project-manager`, resolved live, per John's "sniff test" locked in `ARCHITECTURE.md` §19d. Ready to execute.

**Then:** `S-ARCH-AGENT-LOOP-02` (AA-81, re-scoped) → `S-ARCH-AGENT-LOOP-03` (AA-82) → `S-APPLE-04a` (Data Expert Escalate, §5.5) → `S-APPLE-04b` (Data Integrity Patch, §5.6) → `S-APPLE-04c` (Demo Reset mechanism only, §7) → `S-APPLE-05` (The Reasoner — Memory Consolidation + loop-closure verification) → Structural Enforcement Track (S-ARCH-ENFORCE-03 → 04 → 01 → 02 → 05, see below) → `S-MARKET-INTEL-01/02/03`. Also open, not yet scheduled: `AA-88` (Trainer personnel-file-write broker), `AA-89` (self-read personnel file broker), `AA-90` (Marcus's MI-screen front-door chat surface, blocked on `S-MARKET-INTEL-01`), `AA-91`/`AA-92`/`AA-93`/`AA-94` (backlog, see Resource Ownership Broker Track below), remaining 14-agent `AA-85` roster pass (no session assigned). Non-blocking fast-follow: `AI-43` (`latency_ms` timing fix).

**Last 3 sessions:**
- S-ARCH-LOOP-PATCH-01-design (v6.0.0, 2026-07-02) — Design-only. Patched `S-ARCH-AGENT-LOOP-01`'s known-wrong `available_delegates` shape (`AA-87`, `AA-83` folded in). John's "sniff test" locked into `ARCHITECTURE.md` §19d: any backup/delegation decision must be traceable model judgment, logged — never a static trait, never platform code deciding for the agent (a static "always ask for backup" trait fails even as pure data). Resolved a 3-way split: static trait rejected, requesting agent's own per-call inference selected, Owen Marsh's evaluative-governance role valid but deferred (not folded in). **No fast path** — eliminated the known-capability direct-dispatch path entirely; every `request_help` call always routes through whoever holds `project-manager`, resolved live, even for predictable fixed-workflow outcomes (the outcome's stability comes from live roster state, not a hardcoded route). Two harness-generic tools designed (`request_help`, `delegate_to_agent`), consequential-action gate moved off the deleted delegate-object shape onto the calling capability's own Intent Skill Profile. Forward-looking MCP connection noted (`FEATURES.md` `MC-01`/`MC-02`) — `request_help`'s plain-language shape generalizes to an external caller needing no internal taxonomy knowledge. Kickoff doc written: `docs/kickoffs/v6.0.0-S-ARCH-LOOP-PATCH-01-agent-loop-harness-patch.md`. No code touched. Full detail: `docs/SESSIONS.md`.
- S-ARCH-PM-BROKER-01 (v6.0.0, 575b826, 2026-07-02) — `AA-86` ✅ Done. Michelle Manning's roster ownership broker: `lib/project-manager.js` (`getRosterCandidates()`), deterministic full-roster read, no filtering/embedding search. New Skill Profiles `pm-roster-knowledge`/`agent-selection-intent` on her existing `project-manager` capability, returns ranked candidates + reasoning, never a unilateral pick. New `SERVICE_CATALOG` entry `agent-directory`. Found and fixed live: kickoff's `agents` select referenced nonexistent `docs`/`classes`/`chunks` columns (frontend-mock-only fields) — dropped, `activity_count` nulls until a real source exists. Live-tested standalone via `runCapability()`, real `ai_activity_log` rows confirmed. Post-close-out cross-check (design window) found a duplicate-functionality miss in the kickoff doc — a pre-existing, never-wired `capability-registry-knowledge` profile overlaps with the new one; logged `AA-94` fast-follow, not a defect in what shipped. Unblocks `AA-87`. Full detail: `docs/SESSIONS.md`.
- S-ARCH-OWNERSHIP-02-design (v6.0.0, 2026-07-02) — Design-only. Agent Ownership Matrix (`AA-85`), trimmed to the 7 Market Intelligence-track agents + Alex Reeves per John's request (full 21-agent pass deferred). Michelle's scope confirmed as all 21 agents (not MI-only); her mechanism redesigned mid-session — she surfaces **ranked candidates** with competency signal (ratings/activity counts), never unilaterally selects; the requesting agent chooses and dispatches. New **two-path delegation model** locked into §19d: known-capability delegation (`available_delegates` names a `capability_slug`, resolved live, no broker needed) vs. unknown-skill delegation (`request_help` → broker). **Superseded 2026-07-02 by `S-ARCH-LOOP-PATCH-01-design`** — the known-capability fast path was eliminated entirely per John's sniff test; see that entry. Marcus's `AA-90` scope clarified to the front-door chat surface only, not every HITL moment on the MI screen (Stress Test/Memory Consolidation gates stay Priya's/Elena's own §19d gates). Priya/Nadia/Sam/Alex confirmed Neither; Owen/Elena stay deferred. 7 cleanup/backlog items logged (`DB-20`, `AG-30`, `AG-31`, `SK-22`, `AA-91`–`93`). Unblocked `AA-86`, kickoff written. No code touched. Full detail: `docs/SESSIONS.md`.

Full history (all sessions before this window): `docs/SESSIONS.md` (S-ARCH-OWNERSHIP-01-design, S-ARCH-AUDIT-01-design, S-LIBRARIAN-03, S-LIBRARIAN-03-design, S-LIBRARIAN-02, S-APPLE-04-design, S-APPLE-03b, S-APPLE-03b-design, S-APPLE-03a-2, S-APPLE-03a-2-design, S-APPLE-03a-1, S-APPLE-03a-1-design, S-CAPABILITY-EXEC-02, S-CAPABILITY-EXEC-02-design, S-CAPABILITY-EXEC-01, S-APPLE-03-design, S-APPLE-02c, S-APPLE-02c-design, S-APPLE-02b, S-APPLE-02b-design — have rolled out of this window; see SESSIONS.md for full detail)

**Branch rule:** NEVER merge `dev → main` without John's explicit sign-off.

---

## Open Blockers
- None. S-APPLE-01b's `geo`/`program_area`/`partner_id`/`period` column decision resolved 2026-07-01 (added as 4 real columns, folded into Task 1's migration).
- None. The "shared agent_id" Data Room scoping question (was open, blocking S-APPLE-02) resolved 2026-07-01 via AG-27 The Librarian — superseded by the `queryLibrary()` broker mechanism, not answered directly. See S-LIBRARIAN-01a kickoff doc.
- Q5 resolved 2026-06-13. CAPABILITIES.md + AI-SERVICES.md design complete.
- **Note:** S-INFRA-01 scope may need splitting into 01a (AI Services catalog + 6 extraction jobs) and 01b (capability registry, BYOK, two-speed routing). Decide before S-INFRA-01 design session.
- None. S-APPLE-02c's serverless-slot merge and `llm-as-judge` flip resolved 2026-07-01 by S-APPLE-02c-design — see kickoff doc `docs/kickoffs/v5.3.7-S-APPLE-02c-quality-gate.md`.

---

## Session Queue (short view)

### Resource Ownership Broker Track [v6.0.0 — blocks Agent Loop Track resumption]
> Opened `S-ARCH-OWNERSHIP-01-design` (2026-07-02). `ARCHITECTURE.md` §19e (LOCKED), `FEATURES.md` AA-85–90. Generalizes the Librarian pattern (§19c) platform-wide: certain resources (roster/capability data, personnel-file writes, self-read, MI-screen HITL) are owned exclusively by one agent, structurally, no other code path — while routing/orchestration among agents stays fully agent-reasoned, zero hardcoded targets anywhere. Surfaced when John rejected `S-ARCH-AGENT-LOOP-01`'s `available_delegates` shape (`executing_agent_id`/`critique_agent` name a specific agent directly in another agent's data — Rule #1 violation, same anti-pattern whether the value is a static field or a "generic" harness-level lookup).
- S-ARCH-OWNERSHIP-02-design — Agent Ownership Matrix (AA-85) ✅ done (design-only, 2026-07-02) — trimmed to 7 MI-track agents + Alex per John's request; full 21-agent pass remains open, no session assigned.
- S-ARCH-PM-BROKER-01 — Michelle Manning's ownership broker (AA-86) ✅ done (575b826, 2026-07-02) — `lib/project-manager.js`, returns ranked candidates, never unilaterally selects. One fast-follow logged (`AA-94`, dead duplicate profile, non-blocking).
- S-ARCH-LOOP-PATCH-01-design ✅ done (design-only, 2026-07-02) — patch `S-ARCH-AGENT-LOOP-01`'s harness (AA-87, AA-83 folded in): remove `executing_agent_id`/`critique_agent`; two harness-generic tools, `request_help` (no `agent_id`/`capability_slug` field — no fast path, always routes to whoever holds `project-manager`, resolved live per John's sniff test, `ARCHITECTURE.md` §19d) and `delegate_to_agent` (dispatches straight off the requesting agent's own tool-call argument, chosen from Michelle's candidate list). Kickoff written: `docs/kickoffs/v6.0.0-S-ARCH-LOOP-PATCH-01-agent-loop-harness-patch.md`. **Next session (coding)** — ready to execute.
- S-[TBD] — Trainer (Susan) personnel-file-write broker (AA-88). Needs AA-85 first.
- S-[TBD] — Self-read personnel file broker (AA-89). Needs AA-85 first.
- S-[TBD] — Marcus's MI-screen front-door chat/answer surface ownership (AA-90, scope clarified 2026-07-02 — not every HITL moment on the screen). Blocked on `S-MARKET-INTEL-01` (screen doesn't exist yet).
- S-[TBD] — Cleanup/backlog opened `S-ARCH-OWNERSHIP-02-design`/`S-ARCH-PM-BROKER-01`: Michelle's cross-agent `knowledge_entries` RAG access (AA-92, needs own broker), multi-PM-agent scaling (AA-93, blocks any 2nd PM agent), retire dead `capability-registry-knowledge` profile (AA-94, cheap, non-blocking). Design session required for AA-92/93; AA-94 can go in any upcoming coding session.

### Agent Loop Track [v6.0.0 — blocked on Resource Ownership Broker Track]
> Opened `S-ARCH-AGENT-LOOP-01-design` (2026-07-02). `ARCHITECTURE.md` §19d (LOCKED, corrected 2026-07-02 — see §19e). True agent-initiated delegation (tool-based, multi-turn loop) replacing the screen-scripted handoff model §19b previously specified. Required architecture since the NIGP build's inception — corrected here before any Market Intelligence capability shipped against the old model. **The harness itself (AA-80) shipped with a since-corrected delegate shape — AA-86 now done; LOOP-02/03 still wait on AA-87.**
- S-ARCH-AGENT-LOOP-01 (v6.0.0) — The Agent Loop harness: generic multi-turn loop + consequential-action gate in `execute.js`/`request-receivable.js` (AA-80) ✅ Done (866f8fd, 2026-07-02), **`available_delegates` shape now known-wrong, patch pending as AA-87**. `SE-02` grep script itself still deferred (Structural Enforcement Track, unchanged).
- S-ARCH-AGENT-LOOP-02 — Market Intelligence agent Skill Profile data, corrected model: Marcus/Priya/Nadia's own skill-need expression (no agent-naming fields), self-assessment signals for Michelle to read (AA-81). **Blocked on AA-87.**
- S-ARCH-AGENT-LOOP-03 — Retrofit `channel-intelligence`/`hypothesis-evaluation`/`pipeline-triage`/`quality-gate` onto the corrected loop model, MI-scoped only (AA-82). **Blocked on AA-87.**

### Apple Demo Track [paused — resumes after Agent Loop Track lands]
> Full design: `docs/APPLE-AGENT-1-v5-DESIGN.md`. No deadline-driven scope cuts by explicit direction — sequenced for correctness. `S-APPLE-04a` onward now builds on the Agent Loop foundation (v6.0.0), not the superseded single-shot/screen-handoff model.
- S-APPLE-01a (v5.3.0) — 6 agent personas (identity only) in agents.js + Supabase `agents` rows: Marcus Webb, Priya Nair, Nadia Farouk, Owen Marsh, Sam Reyes, Elena Cho (AG-18/19/20/21/22/23) ✅ done (cfbf431)
- S-APPLE-01b — Data Room seed (20 rows) + versioning/confidence-tier schema migration (10 new columns) ✅ done (7dbba0b). **Corrected `S-LIBRARIAN-03`:** the 20 rows + 10 columns were added onto `knowledge_entries` (wrong table — that's the production personal-training store); moved to a new dedicated `the_Library` table, `ARCHITECTURE.md` §19c.
- S-LIBRARIAN-01a — Eleanor Voss (LB-01) persona + `lib/librarian.js` `queryLibrary()` broker ✅ done (542b1fe)
- S-LIBRARIAN-01b — `ai-enrichment.js` `broker` opt-in wiring + AI Audit `ai_type` fix (`lib/librarian.js`) + `SERVICE_CATALOG`/`AI_TYPE_TO_SERVICE` entries ✅ done (36bff57)
- S-LIBRARIAN-01c — Dan Bingham avatar retrofit (AA-73) ✅ done (3489219)
- S-APPLE-02a — Serverless budget merge (`api/ingest.js` → `api/load-entries.js`, SH-11 first slice) ✅ done (b6f8718)
- S-APPLE-02b — Front door: Intent Routing + Q&A Answer (GEO CSO Expert/Marcus, MI-10/MI-11) ✅ done (231b054)
- S-APPLE-02c — The Proofreader (Guardrail+Eval unified, `needs_review` two-layer rule, MI-12) — design doc §5.7 — ✅ done (af376e8)
- S-CAPABILITY-EXEC-01 — Generic Capability Executor (`AA-76`) + Intent Skill Profile llm/schema (`AA-75`) + `channel-intelligence.js` retired onto it — ✅ done (419ba6f), `AI-40`/`AI-41` attribution gap deferred to EXEC-02
- S-CAPABILITY-EXEC-02 — Retrofit `quality-gate.js` onto `execute.js` (`SH-11`/`AA-76` fully done) + `AI-40`/`AI-41` AI Audit attribution fix — ✅ done (4ba5bc4)
- S-APPLE-03a-1 — Forecast/Theory/Performance Expert (Priya): Generate Hypotheses, `hypothesis-evaluation` capability (identity/behavior/knowledge + `hyp-generation-intent`) as pure Skill Profile data — design doc §5.3 — ✅ done (a18570e)
- S-APPLE-03a-2 — Priya: Stress Test (`hyp-stress-test-intent`, no schema) + Alex: Intelligence Review Format Skill (`intelligence-review-format`, `AA-77`) + generalized format-last extension to `execute.js` — design doc §5.4 — ✅ done (3cead54)
- S-APPLE-03b — The Intake Assistant (Sam): Commit Triage + Failure Triage, `pipeline-triage` capability as pure Skill Profile data — design doc §5.8, 5.9 — ✅ done (31dad57)
- S-LIBRARIAN-02 — Eleanor Voss `writeLibrary()` write broker (`lib/librarian.js`) — prerequisite for S-APPLE-04a/b/c, no agent writes the Data Room directly ✅ done (1e89b64), rewritten onto `the_Library` by `S-LIBRARIAN-03`
- S-LIBRARIAN-03 — Physically separate `the_Library` (business data, Data Rooms) from `knowledge_entries` (personal agent training) — corrects `S-APPLE-01b`'s modeling mistake, prerequisite for S-APPLE-04a. `ARCHITECTURE.md` §19c ✅ done (c3b0d72)
- S-ARCH-AUDIT-01-design — Platform-wide structural-enforcement audit ✅ done (design-only, no commit hash). Full walk of every `ARCHITECTURE.md` LOCKED section + `STANDARDS.md` completeness rule complete. Outcome: 5 `SE-` backlog items logged (`FEATURES.md`), spawned into their own track below. Hardcoded agent-routing check reconfirmed clean (only pre-existing hit: `api/brief.js:73`, tracked as `SK-21`, no action needed).
- S-APPLE-04a — Data Expert (Nadia): Escalate — new Data Room research via `writeLibrary()`, hands back to Stress Test. Round cap: 1/hypothesis (documented constraint, enforced by whichever session builds the real chat loop, not this one) — design doc §5.5
- S-APPLE-04b — Data Expert (Nadia): Data Integrity Patch — disputed-chunk correction via `writeLibrary()`, never overwrites in place — design doc §5.6
- S-APPLE-04c — Demo Reset mechanism only (`writeLibrary()`'s `bulk_reset`, Eleanor-attributed) — UI control deferred to S-MARKET-INTEL-01/03, Column 3 doesn't exist yet — design doc §7
- S-APPLE-05 — The Reasoner (Memory Consolidation) + loop-closure verification (ask same question twice, confirm measurably better answer — the Round 4 demo moment) — design doc §5.10, §9
- S-MARKET-INTEL-01 — Market Intelligence tab: AppShell 3rd tab + default landing route + 3-column screen scaffold per `market-intelligence-v4.html` center content, wired to S-APPLE-02/03 (MI-01, MI-02, SH-15)
- S-MARKET-INTEL-02 — Pipeline Log wired to real agent events + Evidence panel Theory view (MI-03, MI-04)
- S-MARKET-INTEL-03 — Apple AI Audit section + Available Data panel full (MI-06)

### Structural Enforcement Track
> Spawned by `S-ARCH-AUDIT-01-design` (2026-07-02). Each session turns one discipline-only `ARCHITECTURE.md`/`STANDARDS.md` rule into a repeatable, automatable check — see `FEATURES.md` STRUCTURAL ENFORCEMENT — SE section for full detail. **Deliberately deferred behind the Apple Demo Track** (John, 2026-07-02) — no SE- item blocks Apple track work; resumes after S-APPLE-05. Order below confirmed: cheapest / highest-proven-risk first.
- S-ARCH-ENFORCE-03 (design required) — Agent Build Completeness Node test (`SE-03`, STANDARDS.md §11) — prioritized first: this rule already caused one real production crash (Victoria Chen/`RosterScreen`)
- S-ARCH-ENFORCE-04 (design required) — Format Skill Exclusivity data audit (`SE-04`, §13 rule 14 / §19)
- S-ARCH-ENFORCE-01 (design required) — Boundary Enforcement grep: Adapter Layer + Frontend/Backend Distribution (`SE-01`, §5 + §6)
- S-ARCH-ENFORCE-02 (design required) — Shared-Pipeline No-Conditionals grep: Founding Principle + Generic Executor (`SE-02`, §19 + §19b)
- S-ARCH-ENFORCE-05 (design required) — Serverless Function Count check script (`SE-05`, Vercel Hobby limit)

### Standard Track
- S-MIGRATE-02 — Training tab: load/toggle/delete wiring + NIGP card layout ✅ done (02ff560)
- S-MIGRATE-03 — Training tab: Add Courses inline sub-view ✅ done (686007e)
- S-MIGRATE-04 — Training tab: Edit Course inline sub-view ✅ done (732ff4c)
- S-MIGRATE-05 — Playbook tab: output_format CRUD + guardrails ✅ done (1644366)
- S-AVATAR-01 — Avatar consistency sweep ✅ done (d9d43c2)
- S-MIGRATE-06 — Test Agent console (PE-12, needs design session) — deferred until after Apple demo track
- S-BENCH-UX-01 — Bench UI polish ✅ done (812ed59)
- S-BENCH-UX-02 — Bench UI polish round 2 ✅ done (8717106)
- S-AI-ATTR-01 — Capability-agent attribution Michelle + Susan ✅ done (4d568bd)

Full session queue and feature backlog: `docs/FEATURES.md`
Full architecture decisions: `docs/ARCHITECTURE.md`
