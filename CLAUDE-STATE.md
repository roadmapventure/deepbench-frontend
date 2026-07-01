# DeepBench — Current State
> Updated at the close of every session. **Keep this file short.** Only the current version, the next session, and the last 3 sessions (one line each) belong here. Full session history lives in `docs/SESSIONS.md` — read it only when you need version history or root-cause context from a past session, never by default.

**Version in dev:** v5.3.6

**Next session:** S-APPLE-02c (coding) — kickoff doc ready: `docs/kickoffs/v5.3.7-S-APPLE-02c-quality-gate.md`. Start with: "Read docs/kickoffs/v5.3.7-S-APPLE-02c-quality-gate.md and CLAUDE-STATE.md, then execute it."

**Then:** S-MARKET-INTEL-01 — Market Intelligence tab scaffold (blocked on S-APPLE-02c shipping first; MI-04/S-MARKET-INTEL-02 is what actually wires quality-gate's output into the Pipeline Log).

**Last 3 sessions:**
- S-APPLE-02c-design (v5.3.7, 2026-07-01) — Architect Review across ARCHITECTURE.md, `channel-intelligence.js`, `agents.js`, `useAIActivity.js`, live Supabase schema (`capabilities`/`skill_profiles`/`capability_skill_profiles`/`agent_capability_assignments`, read-only). Owen Marsh (CI-04) already existed from S-APPLE-01a — no agent build needed. Two decisions walked with John: session stayed bundled as one kickoff doc rather than splitting into 02c-a/02c-b (explicit scope exception documented in the kickoff doc); retry-on-block orchestration lives inside `quality-gate.js` itself (imports `runChannelIntelligence` directly, same direct-import pattern as `assemblePrompt`/`enrichPrompt` — John deferred the call, this was the recommended option). Locked two session-specific facts the design doc left ambiguous: eval scores are integer 1–5, revise threshold is any dimension ≤3. Merge candidate for the second SH-11 slice identified and verified low-risk: `api/upload-csv.js` → `api/extract.js` (both deterministic, no AI call, 4 total call sites, only 2 need edits since extract's default action preserves existing callers byte-identical). Found and closed a pre-existing gap: neither `extract.js` nor `upload-csv.js` currently calls `logAICall()` — closing it is now part of Task 1. Corrected `docs/APPLE-AGENT-1-v5-DESIGN.md` §5.7's stale "PAT-19" label to the real `llm-as-judge` pattern slug (doc edit only, no code). Logged `AI-39` — generalize the retry mechanism once a second answer-producing capability exists. Kickoff doc: `docs/kickoffs/v5.3.7-S-APPLE-02c-quality-gate.md`. No code touched.
- S-APPLE-02b (v5.3.6, 231b054, 2026-07-01) — MI-10/MI-11 ✅ Done. `api/capabilities/channel-intelligence.js` (new) — `action:'route'` (Haiku, 5-way intent classification) and `action:'answer'` (Sonnet, RAG-backed via the Librarian, self-flags `needs_review`). `api/prompt/db-assembly.js`: `intent_slug` per-call filter (`ARCHITECTURE.md` §2) + `traits.broker` passthrough, both additive/opt-in, verified byte-identical for every existing caller. `src/hooks/useAIActivity.js`: `channel-intelligence` SERVICE_CATALOG entry (no Apple branding, by design) + `ci_routing`/`ci_answer` → `channel-intelligence` mapping. Scope grew to a 4th file mid-session (approved) — `api/prompt/ai-enrichment.js` needed a `debug.librarian_tier` passthrough that the kickoff doc had flagged as uncertain; verified independently via diff, minimal and additive (3 lines, null for every non-broker call). Serverless count 11→12, at the Vercel Hobby ceiling. Independently re-verified rather than trusted from the report: git diff read directly against the kickoff doc spec for all 4 files; live Supabase query confirmed real `marcus` (`ci_routing`, `ci_answer`) and `eleanor` (`librarian`) `ai_activity_log` rows clustered within the same ~20s window, proving the broker actually engaged rather than being bypassed. 6/6 Manual QA PASS (John, live dev URL) — Channel Intelligence/marcus/eleanor all correct in AI Audit, zero Work dashboard regression, zero console errors.
- S-APPLE-02b-design (v5.3.6, 2026-07-01) — Full Architect Review + scope walked item-by-item with John. Two real gaps found in the shared Prompt Service pipeline (both generic fixes, not Marcus-specific): (1) `assemblePrompt()` needed the `intent_slug` filter already flagged in `ARCHITECTURE.md` §2; (2) previously undocumented — `db-assembly.js` never actually read any field to set `fetch_instruction.broker`, so S-LIBRARIAN-01b's broker mechanism could never fire for any Skill Profile. Persona locked: Marcus is VP of Channel Sales, expertise-only — not allowed to access the Data Room directly, must request research from the Librarian and synthesize the answer himself (`ci-knowledge.traits.broker: "librarian"` enforces this). Confirmed via Supabase: no naming collisions, Marcus's `data_room_access` already matches the 20 seeded rows, serverless count 11→12 exactly at the Hobby ceiling. Found and logged two out-of-scope items rather than silently deferring: `AI-37` (`api/rag-query.js` is a public, unauthenticated endpoint that bypasses the Librarian broker entirely for any Data Room tag — pre-existing, platform-wide, not introduced here) and `AI-38` (generalize the unused `isAppleChannel` boolean into a real agent `section` taxonomy for AI Audit grouping). Revised `MI-06` — no "Apple Channel" grouping on the *global* AI Audit screen per John; that detail moves to a new local Column 3 drawer in Market Intelligence instead. Kickoff doc written: `docs/kickoffs/v5.3.6-S-APPLE-02b-channel-intelligence.md`. No code touched.

Full history (all sessions before this window): `docs/SESSIONS.md` (S-APPLE-02a, 2026-07-01, b6f8718 — SH-11 first slice — has rolled out of this window; see SESSIONS.md for full detail)

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

### Apple Demo Track
> Full design: `docs/APPLE-AGENT-1-v5-DESIGN.md`. No deadline-driven scope cuts by explicit direction — sequenced for correctness.
- S-APPLE-01a (v5.3.0) — 6 agent personas (identity only) in agents.js + Supabase `agents` rows: Marcus Webb, Priya Nair, Nadia Farouk, Owen Marsh, Sam Reyes, Elena Cho (AG-18/19/20/21/22/23) ✅ done (cfbf431)
- S-APPLE-01b — Data Room seed (20 rows) + versioning/confidence-tier schema migration (10 new columns) ✅ done (7dbba0b)
- S-LIBRARIAN-01a — Eleanor Voss (LB-01) persona + `lib/librarian.js` `queryLibrary()` broker ✅ done (542b1fe)
- S-LIBRARIAN-01b — `ai-enrichment.js` `broker` opt-in wiring + AI Audit `ai_type` fix (`lib/librarian.js`) + `SERVICE_CATALOG`/`AI_TYPE_TO_SERVICE` entries ✅ done (36bff57)
- S-LIBRARIAN-01c — Dan Bingham avatar retrofit (AA-73) ✅ done (3489219)
- S-APPLE-02a — Serverless budget merge (`api/ingest.js` → `api/load-entries.js`, SH-11 first slice) ✅ done (b6f8718)
- S-APPLE-02b — Front door: Intent Routing + Q&A Answer (GEO CSO Expert/Marcus, MI-10/MI-11) ✅ done (231b054)
- S-APPLE-02c — The Proofreader (Guardrail+Eval unified, `needs_review` two-layer rule, MI-12) — design doc §5.7 — kickoff doc ready: `docs/kickoffs/v5.3.7-S-APPLE-02c-quality-gate.md`
- S-APPLE-03 — Forecast/Theory/Performance Expert (Generate Hypotheses + Stress Test, fires before commit) + The Intake Assistant (Commit + Failure Triage) — design doc §5.3, 5.4, 5.8, 5.9
- S-APPLE-04 — Data Expert (Escalate execution + Data Integrity Patch) + Demo Reset control (UI + reset operation) — design doc §5.5, 5.6, 7
- S-APPLE-05 — The Reasoner (Memory Consolidation) + loop-closure verification (ask same question twice, confirm measurably better answer — the Round 4 demo moment) — design doc §5.10, §9
- S-MARKET-INTEL-01 — Market Intelligence tab: AppShell 3rd tab + default landing route + 3-column screen scaffold per `market-intelligence-v4.html` center content, wired to S-APPLE-02/03 (MI-01, MI-02, SH-15)
- S-MARKET-INTEL-02 — Pipeline Log wired to real agent events + Evidence panel Theory view (MI-03, MI-04)
- S-MARKET-INTEL-03 — Apple AI Audit section + Available Data panel full (MI-06)

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
