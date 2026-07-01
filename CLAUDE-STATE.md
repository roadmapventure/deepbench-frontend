# DeepBench — Current State
> Updated at the close of every session. **Keep this file short.** Only the current version, the next session, and the last 3 sessions (one line each) belong here. Full session history lives in `docs/SESSIONS.md` — read it only when you need version history or root-cause context from a past session, never by default.

**Version in dev:** v5.3.2

**Next session:** S-LIBRARIAN-01b — broker opt-in wiring (`fetch_instruction.broker` in `api/prompt/ai-enrichment.js`) + AI Audit `ai_type` fix (`lib/librarian.js` was logging `"deterministic"`, unattributable — fixed to `"librarian"`) + `SERVICE_CATALOG`/`AI_TYPE_TO_SERVICE` entries. Kickoff doc ready: `docs/kickoffs/v5.3.3-S-LIBRARIAN-01b-broker-wiring-audit.md`. **Then S-LIBRARIAN-01c** — Dan Bingham avatar retrofit (AA-73, `PromptEvolutionModal.jsx` only) — split out of 01b to keep it at 3 files after the `ai_type` fix was found; no kickoff doc yet. **Then S-APPLE-02** — Front door: Intent Routing + Q&A Answer (GEO CSO Expert) + The Proofreader. Design doc §5.1, 5.2, 5.7. Marcus's Q&A Answer call goes through Eleanor (`fetch_instruction.broker:"librarian"`), not a raw `queryRAG()` scope param.

**Last 3 sessions:**
- S-LIBRARIAN-01b-design (v5.3.3, 2026-07-01) — Architect Review caught an AI Audit attribution bug in already-shipped 01a code: `lib/librarian.js` logged `ai_type:"deterministic"`, which has no `AI_TYPE_TO_SERVICE` mapping and matches no `SERVICE_CATALOG` slug — Eleanor's calls would never attribute to a service no matter what catalog entry got added. Split the originally-planned single "01b" session (broker wiring + audit wiring + Dan Bingham retrofit, 3 files) into 01b (broker wiring + the `ai_type` fix, 3 files: `lib/librarian.js`, `ai-enrichment.js`, `useAIActivity.js`) and 01c (Dan Bingham retrofit alone, 1 file: `PromptEvolutionModal.jsx`) to stay in-budget without deferring the audit fix. Also found and closed a stale-state gap: 01a's code was committed (`542b1fe`) and QA'd but `CLAUDE-STATE.md`/`FEATURES.md` close-out was never finished — completed retroactively this session (commit `767588a`). Kickoff doc written for 01b: `docs/kickoffs/v5.3.3-S-LIBRARIAN-01b-broker-wiring-audit.md`. No code touched.
- S-LIBRARIAN-01a (v5.3.2, 542b1fe, 2026-07-01) — AG-27 ✅ Done. `lib/librarian.js`: `queryLibrary()` broker built — credential-checked Data Room access via new `agents.data_room_access`/`uber_access` columns, wraps `queryRAG()` without duplicating it. `agents.js`: Eleanor Voss (LB-01) full 23-field persona + AVATAR_CFG + AGENT_PRONOUNS. Supabase: `marcus`/`priya`/`nadia` seeded with `data_room_access:["apple-cso-data-room"]`. Live Node test (not mocked) verified via direct Supabase re-check: Marcus's live query returns real Apple Data Room chunks, Chloe (no access) denied with zero chunks, temporary uber-access grant exercised and cleaned up (`ai_activity_log` shows exactly 3 `agent_id:'eleanor'` rows in a 2-second window, matching the 3 logging code paths exactly; `test-uber-temp` row confirmed absent post-cleanup). 9/9 Manual QA PASS. Identity + mechanism only — no production call site invokes her yet (S-LIBRARIAN-01b).
- S-LIBRARIAN-01a-design (v5.3.2, 2026-07-01) — AG-27 The Librarian fully designed: persona (Eleanor Voss, LB-01) + `queryLibrary()` broker mechanism + `agents.data_room_access`/`uber_access` schema + opt-in `fetch_instruction.broker` field (proven not to touch the Work page's call path). Pivoted ahead of S-APPLE-02 to avoid retrofitting the Data Room access workaround twice. Also named AA-73 (agent avatar visibility standing rule + Dan Bingham retrofit debt) and AA-74 (multi-Data-Room RPC limitation). Kickoff doc written, no code touched. Full detail: `docs/SESSIONS.md`.

Full history (all sessions before this window): `docs/SESSIONS.md`

**Branch rule:** NEVER merge `dev → main` without John's explicit sign-off.

---

## Open Blockers
- None. S-APPLE-01b's `geo`/`program_area`/`partner_id`/`period` column decision resolved 2026-07-01 (added as 4 real columns, folded into Task 1's migration).
- None. The "shared agent_id" Data Room scoping question (was open, blocking S-APPLE-02) resolved 2026-07-01 via AG-27 The Librarian — superseded by the `queryLibrary()` broker mechanism, not answered directly. See S-LIBRARIAN-01a kickoff doc.
- Q5 resolved 2026-06-13. CAPABILITIES.md + AI-SERVICES.md design complete.
- **Note:** S-INFRA-01 scope may need splitting into 01a (AI Services catalog + 6 extraction jobs) and 01b (capability registry, BYOK, two-speed routing). Decide before S-INFRA-01 design session.

---

## Session Queue (short view)

### Apple Demo Track
> Full design: `docs/APPLE-AGENT-1-v5-DESIGN.md`. No deadline-driven scope cuts by explicit direction — sequenced for correctness.
- S-APPLE-01a (v5.3.0) — 6 agent personas (identity only) in agents.js + Supabase `agents` rows: Marcus Webb, Priya Nair, Nadia Farouk, Owen Marsh, Sam Reyes, Elena Cho (AG-18/19/20/21/22/23) ✅ done (cfbf431)
- S-APPLE-01b — Data Room seed (20 rows) + versioning/confidence-tier schema migration (10 new columns) ✅ done (7dbba0b)
- S-LIBRARIAN-01a — Eleanor Voss (LB-01) persona + `lib/librarian.js` `queryLibrary()` broker ✅ done (542b1fe)
- S-LIBRARIAN-01b — `ai-enrichment.js` `broker` opt-in wiring + AI Audit `ai_type` fix (`lib/librarian.js`) + `SERVICE_CATALOG`/`AI_TYPE_TO_SERVICE` entries — kickoff doc ready: `docs/kickoffs/v5.3.3-S-LIBRARIAN-01b-broker-wiring-audit.md`
- S-LIBRARIAN-01c — Dan Bingham avatar retrofit (AA-73, `PromptEvolutionModal.jsx` only) — split from 01b 2026-07-01, needs a design session first, no kickoff doc yet
- S-APPLE-02 — Front door: Intent Routing + Q&A Answer (GEO CSO Expert) + The Proofreader (Guardrail+Eval unified, `needs_review` two-layer rule) — design doc §5.1, 5.2, 5.7 — Marcus's Q&A call routes through Eleanor, not raw `queryRAG()`
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
