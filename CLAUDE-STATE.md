# DeepBench — Current State
> Updated at the close of every session. **Keep this file short.** Only the current version, the next session, and the last 3 sessions (one line each) belong here. Full session history lives in `docs/SESSIONS.md` — read it only when you need version history or root-cause context from a past session, never by default.

**Version in dev:** v5.3.12

**Next session:** S-LIBRARIAN-02 — Eleanor Voss `writeLibrary()` write broker (`lib/librarian.js`) — prerequisite for all of S-APPLE-04, since Data Expert never writes `knowledge_entries` directly. Kickoff doc ready: `docs/kickoffs/v5.3.13-S-LIBRARIAN-02-write-broker.md`.

**Then:** S-APPLE-04a (Data Expert — Escalate, §5.5) → S-APPLE-04b (Data Expert — Data Integrity Patch, §5.6) → S-APPLE-04c (Demo Reset mechanism only, §7 — UI control deferred to S-MARKET-INTEL-01/03, Column 3 doesn't exist yet) → S-APPLE-05 (The Reasoner — Memory Consolidation + loop-closure verification).

**Last 3 sessions:**
- S-APPLE-04-design (v5.3.13, 2026-07-02) — Design-only. Split `S-APPLE-04`'s three pieces (Escalate, Data Integrity Patch, Demo Reset) into `04a`/`04b`/`04c` per the max-3-files/max-4-tasks rule; John confirmed the split, Escalate round cap at 1/hypothesis (documented as a spec constraint for whichever session builds the real chat loop — `S-MARKET-INTEL-01`/`02` — not enforced in code yet, no screen exists to hold that state), and Demo Reset ships mechanism-only this round (UI control deferred, same reason). **Major correction mid-session (John):** all three pieces would have written `knowledge_entries` directly — violates the locked Librarian gatekeeper model from `S-LIBRARIAN-01a` (only Eleanor Voss touches the Data Room, no other agent, reads or writes). Inserted `S-LIBRARIAN-02` ahead of all three as a new prerequisite session and designed it fully this session (kickoff doc written, not yet coded) — `writeLibrary()` in `lib/librarian.js`, three operations (`insert`/`update_status`/`bulk_reset`), same credential model as the existing `queryLibrary()` read broker. Eleanor granted `uber_access` (Supabase) for `bulk_reset` (Demo Reset is an admin action, not any one persona's job). Extracted `load-entries.js`'s inline embed-and-upsert into a shared `lib/knowledge-write.js` helper so both the Training tab and `writeLibrary()` call one implementation. `AA-72` (`FEATURES.md`) resolved as moot, not fixed — `load-entries.js`'s PATCH whitelist stays `active`/`disabled`-only because it serves agent training content, a separate system from the Library (confirmed by John: the Library and per-agent training RAG share a table but are not the same store). Memory saved (`project-librarian-gatekeeper.md`) so this isn't re-discovered next session. Kickoff doc: `docs/kickoffs/v5.3.13-S-LIBRARIAN-02-write-broker.md`. No code touched.
- S-APPLE-03b (v5.3.12, 31dad57, 2026-07-02) — `AG-29` ✅ Done. `pipeline-triage` capability, both calls in one session: `intake-identity`/`intake-behavior`/`intake-commit-intent`/`intake-failure-intent` live in Supabase, Sam Reyes assigned. Deliberately **no** `intake-knowledge` profile — Sam has zero Data Room access (`data_room_access: []`), both calls reason entirely over their input payload, same shape as Owen Marsh's `quality-gate`. Deferred as `AA-79`. Zero new route file. Serverless count unchanged at 11. **QA verified directly by Claude** (John asked Claude to run it): all 9 checklist items confirmed — Supabase rows exact match, dispute-case Commit Triage correctly returned `route_to:["reasoner","data-expert"]` with a non-null `disputed_chunk_id`, Failure Triage correctly set `recommend_escalate:true` for `empty_retrieval`. Items 6–7 (AI Audit UI) confirmed at the data level (`ai_activity_log` rows exact match, same basis the screens read from), not a live screenshot. Item 9 (Vercel logs) accepted on indirect evidence, no Vercel CLI/MCP access in this environment, same basis as prior sessions.
- S-APPLE-03b-design (v5.3.12, 2026-07-02) — Design-only, confirmed with John: no `intake-knowledge` Skill Profile this session — Sam has zero Data Room access (`data_room_access: []`, confirmed live) and both her calls reason entirely over their input payload, same situation as Owen Marsh's `quality-gate` (which shipped without a Knowledge profile). Deferred as new `AA-79`, revisit only if a live chunk-status lookup need is identified. Single session, not split a/b — no RAG/broker/Format Skill complexity, unlike `hypothesis-evaluation`. New feature ID logged: `AG-29`. Kickoff doc: `docs/kickoffs/v5.3.12-S-APPLE-03b-intake-assistant-triage.md`. No code touched.

Full history (all sessions before this window): `docs/SESSIONS.md` (S-APPLE-03a-2, S-APPLE-03a-2-design, S-APPLE-03a-1, S-APPLE-03a-1-design, S-CAPABILITY-EXEC-02, S-CAPABILITY-EXEC-02-design, S-CAPABILITY-EXEC-01, S-APPLE-03-design, S-APPLE-02c, S-APPLE-02c-design, S-APPLE-02b, S-APPLE-02b-design — have rolled out of this window; see SESSIONS.md for full detail)

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
- S-CAPABILITY-EXEC-02 — Retrofit `quality-gate.js` onto `execute.js` (`SH-11`/`AA-76` fully done) + `AI-40`/`AI-41` AI Audit attribution fix — ✅ done (4ba5bc4)
- S-APPLE-03a-1 — Forecast/Theory/Performance Expert (Priya): Generate Hypotheses, `hypothesis-evaluation` capability (identity/behavior/knowledge + `hyp-generation-intent`) as pure Skill Profile data — design doc §5.3 — ✅ done (a18570e)
- S-APPLE-03a-2 — Priya: Stress Test (`hyp-stress-test-intent`, no schema) + Alex: Intelligence Review Format Skill (`intelligence-review-format`, `AA-77`) + generalized format-last extension to `execute.js` — design doc §5.4 — ✅ done (3cead54)
- S-APPLE-03b — The Intake Assistant (Sam): Commit Triage + Failure Triage, `pipeline-triage` capability as pure Skill Profile data — design doc §5.8, 5.9 — ✅ done (31dad57)
- S-LIBRARIAN-02 — Eleanor Voss `writeLibrary()` write broker (`lib/librarian.js`) — prerequisite for S-APPLE-04a/b/c, no agent writes `knowledge_entries` directly. Kickoff doc ready: `docs/kickoffs/v5.3.13-S-LIBRARIAN-02-write-broker.md`
- S-APPLE-04a — Data Expert (Nadia): Escalate — new Data Room research via `writeLibrary()`, hands back to Stress Test. Round cap: 1/hypothesis (documented constraint, enforced by whichever session builds the real chat loop, not this one) — design doc §5.5
- S-APPLE-04b — Data Expert (Nadia): Data Integrity Patch — disputed-chunk correction via `writeLibrary()`, never overwrites in place — design doc §5.6
- S-APPLE-04c — Demo Reset mechanism only (`writeLibrary()`'s `bulk_reset`, Eleanor-attributed) — UI control deferred to S-MARKET-INTEL-01/03, Column 3 doesn't exist yet — design doc §7
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
