# DeepBench — Current State
> Updated at the close of every session. **Keep this file short.** Only the current version, the next session, and the last 3 sessions (one line each) belong here. Full session history lives in `docs/SESSIONS.md` — read it only when you need version history or root-cause context from a past session, never by default.

**Version in dev:** v5.3.8

**Next session:** S-CAPABILITY-EXEC-02 — Retrofit `quality-gate.js` onto `execute.js` + `AI-40`/`AI-41` AI Audit attribution fix (`ai_type` derived from `capability_slug` in `request-receivable.js`'s Step 4 log). Retry-on-block dropped per `ARCHITECTURE.md` §19b, deferred to a future Layer 2 caller. Kickoff doc: `docs/kickoffs/v5.3.9-S-CAPABILITY-EXEC-02-quality-gate-retrofit.md`.

**Then:** S-APPLE-03a (Priya/`hypothesis-evaluation`, pure Skill Profile data) → S-APPLE-03b (Sam/`pipeline-triage`, pure Skill Profile data).

**Last 3 sessions:**
- S-CAPABILITY-EXEC-02-design (v5.3.9, 2026-07-02) — Design-only, confirmed with John: (1) `ai_type` derivation uses `capability_slug` not `format_contract.skill_profile_slug` — bounded, needs zero new `AI_TYPE_TO_SERVICE` entries for `channel-intelligence`/`quality-gate` (already match `SERVICE_CATALOG` slugs exactly via the existing `|| e.type` fallback), only one new entry (`project-manager` → `task-planning`) for `plan.js`'s dynamic Format Skill callers. (2) `quality-gate.js`'s retry-on-block loop dropped entirely this session — no Layer 2 caller exists yet, matches `ARCHITECTURE.md` §19b (cross-capability handoff is Layer 2's job, never Layer 3's); superseded `S-APPLE-02c-design`'s earlier recommendation to keep it inline, which predates §19b. Found `AI-40` is dead code, not a live bug (the "By Service" fallback already resolves `'request-receivable'` correctly regardless of the mapping typo) — resolves as superseded by `AI-41`'s fix, no separate patch, `FEATURES.md` updated accordingly. Verified live via Supabase: `qg-review-intent` has correct `llm_model`/`max_tokens`, `traits` still `{}` (Task 1 backfills it, exact copy of `quality-gate.js`'s `QUALITY_GATE_TOOL.input_schema`). Serverless count confirmed 12→11 after retirement (delete only, no new file). Kickoff doc: `docs/kickoffs/v5.3.9-S-CAPABILITY-EXEC-02-quality-gate-retrofit.md`. No code touched.
- S-CAPABILITY-EXEC-01 (v5.3.8, 419ba6f, 2026-07-02) — `AA-75`/`AA-76` 🔶 Partial done. `api/capabilities/execute.js` (new) — the Generic Capability Executor: `assemblePrompt()` → `enrichPrompt()` → `sendRequest()`, zero capability-specific code, same sequence `plan.js` already proves in production. `api/prompt/db-assembly.js`'s `intent` branch now populates `llm`/`format_contract.schema` from the matched Intent Skill Profile, mirroring the `format` branch — additive, byte-identical fallback confirmed for every capability that doesn't set these. Supabase: `traits.schema` backfilled on `ci-routing-intent`/`ci-answer-intent`, verified live matches the previously-hardcoded `ROUTING_TOOL`/`ANSWER_TOOL` shapes exactly. `api/capabilities/channel-intelligence.js` deleted. Serverless count 12→13→12, net zero, confirmed. Node test 28/28 PASS, build zero errors. **Root-caused a real Manual QA regression before John even had to click through the UI** (queried `ai_activity_log` directly): Marcus's calls lost their specific `ci_routing`/`ci_answer` attribution to `channel-intelligence` in the AI Audit, now logging generically via `sendRequest()`'s own hardcoded `ai_type: 'request-receivable'` — logged as `AI-41`, plus an unrelated pre-existing key-typo bug found in the process (`AI-40`, `request_receivable` vs `request-receivable`). **John's call:** accept both as known, logged gaps rather than block the session — all 6 Manual QA items PASS, patch explicitly deferred to `S-CAPABILITY-EXEC-02`. `quality-gate.js`'s retry-on-block import of the now-deleted `runChannelIntelligence` is expected-broken, not fixed this session (Section 7 scope rule, tracked for EXEC-02).
- S-APPLE-03-design (v5.3.8, 2026-07-01) — Started as Market Intelligence agent design (Priya/`hypothesis-evaluation`, Sam/`pipeline-triage`, design doc §5.3/5.4/5.8/5.9), pivoted platform-wide after John challenged why `channel-intelligence.js`/`quality-gate.js` hardcode model/schema selection instead of reading Skill Profile data. Root cause traced to the `S-APPLE-02b` kickoff doc's explicit instruction to read `request-receivable.js` "as precedent only, not imported" — verified live against Supabase: `ci-routing-intent`/`ci-answer-intent`/`qg-review-intent` already carry the correct `llm_model`/`max_tokens`, `db-assembly.js` just never read them off an Intent-type Skill Profile. Locked `ARCHITECTURE.md` §19b — The Generic Capability Executor: new capabilities are Supabase data, never a new route; superseded the "new capabilities are new routes" rules in §1 and §13. Revised session queue confirmed with John: `S-CAPABILITY-EXEC-01` → `02` → `S-APPLE-03a`/`03b`. Kickoff doc written for `S-CAPABILITY-EXEC-01`: `docs/kickoffs/v5.3.8-S-CAPABILITY-EXEC-01-generic-executor.md`. No code touched.

Full history (all sessions before this window): `docs/SESSIONS.md` (S-APPLE-02c, S-APPLE-02c-design, S-APPLE-02b, S-APPLE-02b-design — have rolled out of this window; see SESSIONS.md for full detail)

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
- S-APPLE-02c — The Proofreader (Guardrail+Eval unified, `needs_review` two-layer rule, MI-12) — design doc §5.7 — ✅ done (af376e8)
- S-CAPABILITY-EXEC-01 — Generic Capability Executor (`AA-76`) + Intent Skill Profile llm/schema (`AA-75`) + `channel-intelligence.js` retired onto it — ✅ done (419ba6f), `AI-40`/`AI-41` attribution gap deferred to EXEC-02
- S-CAPABILITY-EXEC-02 — Retrofit `quality-gate.js` onto `execute.js` + resolve retry-on-block orchestration ownership + fix `AI-40`/`AI-41`
- S-APPLE-03a — Forecast/Theory/Performance Expert (Priya): Generate Hypotheses + Stress Test, `hypothesis-evaluation` capability as pure Skill Profile data + Intelligence Review Format Skill (new, for Alex/Riley) + hypothesis validity guardrail — design doc §5.3, 5.4
- S-APPLE-03b — The Intake Assistant (Sam): Commit Triage + Failure Triage, `pipeline-triage` capability as pure Skill Profile data — design doc §5.8, 5.9
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
