# DeepBench — Current State
> Updated at the close of every session. **Keep this file short.** Only the current version, the next session, and the last 3 sessions (one line each) belong here. Full session history lives in `docs/SESSIONS.md` — read it only when you need version history or root-cause context from a past session, never by default.

**Version in dev:** v5.3.13

**Next session:** S-LIBRARIAN-03 — physically separate `the_Library` (business data, Data Rooms) from `knowledge_entries` (personal agent training data, production, unchanged). Corrects a modeling mistake from `S-APPLE-01b-design` that bolted Data Room columns onto the wrong table. `ARCHITECTURE.md` §19c (new, LOCKED) is the model; kickoff doc ready: `docs/kickoffs/v5.3.14-S-LIBRARIAN-03-the-library-migration.md`. Blocks `S-APPLE-04a` — Nadia's Escalate write depends on `the_Library` existing first.

**Then:** S-ARCH-AUDIT-01 (structural-enforcement audit — design session, see Session Queue below, run after S-LIBRARIAN-03 QA closes) → S-APPLE-04a (Data Expert Escalate, §5.5) → S-APPLE-04b (Data Integrity Patch, §5.6) → S-APPLE-04c (Demo Reset mechanism only, §7 — UI control deferred to S-MARKET-INTEL-01/03) → S-APPLE-05 (The Reasoner — Memory Consolidation + loop-closure verification).

**Last 3 sessions:**
- S-LIBRARIAN-03-design (v5.3.14, 2026-07-02) — Design-only. Started as `S-APPLE-04a`'s Architect Review (Nadia's Escalate) and escalated into a platform data-model correction after John caught two consecutive misrepresentations of the Library/Data Room/Librarian access model — first a UI-location framing error ("director in the Data Room"), then a backwards migration direction (proposed moving personal training data out of `knowledge_entries`, when the actual fix is the opposite: extract Data Room content, which was bolted on in `S-APPLE-01b-design`, into its own table). Verified live via Supabase: `knowledge_entries` held 54 rows — 20 `apple-cso-data-room` (the actual Data Room) + 34 across `brent`/`michelle`/`bob`/`robyn` (personal training, confirmed via `agent_training_sessions` FK as the real production feature). Also found and disclosed the RLS-disabled advisory (all 16 tables) — logged as `AI-42`, not fixed this session. Locked `ARCHITECTURE.md` §19c: `the_Library` (new table, business data) vs `knowledge_entries` (personal training, unchanged) — physically separate, Eleanor's broker owns `the_Library`'s primitives internally, not exported, no opt-in bypass. `data_rooms` registry table added per John's direction (Data Room = a field within `the_Library`, not a physical split — same pattern as `tenant_id`). Re-scoped `AI-37` (pending, resolves once this ships) and reverted `knowledge_entries`'s stale schema note in `ARCHITECTURE.md` §9. Kickoff doc: `docs/kickoffs/v5.3.14-S-LIBRARIAN-03-the-library-migration.md`. No code touched.
- S-LIBRARIAN-02 (v5.3.13, 1e89b64, 2026-07-02) — `AG-27` ✅ Done. `writeLibrary()` added to `lib/librarian.js` (`insert`/`update_status`/`bulk_reset`), same credential model as `queryLibrary()`. Embed-and-upsert logic extracted from `load-entries.js` into shared `lib/knowledge-write.js`, both the Training tab and `writeLibrary()` now call one implementation. Eleanor granted `uber_access` (sole agent with it). Coding session found and fixed 2 bugs beyond the kickoff doc's literal spec, root-caused not patched: (1) `bulk_reset` originally let any single-Data-Room agent trigger a full reset scoped to her own room — the doc's own checklist required this denied, restructured so `bulk_reset` always requires `uber_access` + explicit `data_room_tag`; (2) the POST wrapper's catch collapsed all errors to 500, losing the pre-extraction 400 for missing `title`/`content` — restored, per the doc's own Category M byte-identical-behavior rule. Serverless count unchanged at 11. `AA-72` (`FEATURES.md`) closed as superseded, moved to `FEATURES-ARCHIVE.md` — `load-entries.js`'s PATCH whitelist was never touched, it wasn't the gap. **QA verified directly by Claude** (John asked Claude to run it): all 7 checklist items confirmed — `eleanor.uber_access` true and sole holder, no orphaned test rows, 20 baseline rows active, live POST against the deployed dev URL (`1e89b64`) round-tripped a real document with byte-identical defaults to the pre-refactor behavior, `librarian-write` `ai_activity_log` rows cleanly separate from `librarian` (read) rows, serverless count 11 confirmed against the actual deployed commit. Item 7 (Vercel logs) accepted on indirect evidence, no Vercel CLI/MCP access in this environment — the live call's clean 200 response is the available signal. **Note (2026-07-02, S-LIBRARIAN-03-design):** this session's `writeLibrary()` targeted `knowledge_entries`/`agent_id` — superseded by `S-LIBRARIAN-03`'s rewrite onto `the_Library`/`data_room_tag`, same external function signatures, credential model unchanged.
- S-APPLE-04-design (v5.3.13, 2026-07-02) — Design-only. Split `S-APPLE-04`'s three pieces (Escalate, Data Integrity Patch, Demo Reset) into `04a`/`04b`/`04c` per the max-3-files/max-4-tasks rule; John confirmed the split, Escalate round cap at 1/hypothesis (documented as a spec constraint for whichever session builds the real chat loop — `S-MARKET-INTEL-01`/`02` — not enforced in code yet, no screen exists to hold that state), and Demo Reset ships mechanism-only this round (UI control deferred, same reason). **Major correction mid-session (John):** all three pieces would have written `knowledge_entries` directly — violates the locked Librarian gatekeeper model from `S-LIBRARIAN-01a` (only Eleanor Voss touches the Data Room, no other agent, reads or writes). Inserted `S-LIBRARIAN-02` ahead of all three as a new prerequisite session and designed it fully this session. Memory saved (`project-librarian-gatekeeper.md`) so this isn't re-discovered next session. Kickoff doc: `docs/kickoffs/v5.3.13-S-LIBRARIAN-02-write-broker.md`. No code touched.

Full history (all sessions before this window): `docs/SESSIONS.md` (S-APPLE-03b, S-APPLE-03b-design, S-APPLE-03a-2, S-APPLE-03a-2-design, S-APPLE-03a-1, S-APPLE-03a-1-design, S-CAPABILITY-EXEC-02, S-CAPABILITY-EXEC-02-design, S-CAPABILITY-EXEC-01, S-APPLE-03-design, S-APPLE-02c, S-APPLE-02c-design, S-APPLE-02b, S-APPLE-02b-design — have rolled out of this window; see SESSIONS.md for full detail)

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
- S-LIBRARIAN-03 — Physically separate `the_Library` (business data, Data Rooms) from `knowledge_entries` (personal agent training) — corrects `S-APPLE-01b`'s modeling mistake, prerequisite for S-APPLE-04a. `ARCHITECTURE.md` §19c. Kickoff doc ready: `docs/kickoffs/v5.3.14-S-LIBRARIAN-03-the-library-migration.md`
- **S-ARCH-AUDIT-01** (design session, no kickoff doc yet) — Platform-wide structural-enforcement audit, requested by John 2026-07-02 after `S-LIBRARIAN-03-design` found a LOCKED rule (Library/Data Room separation) that was stated, agreed, even written into a prior kickoff doc's context section — but never structurally enforced, and drifted anyway. Scope: (1) walk every `ARCHITECTURE.md` LOCKED section + `STANDARDS.md` completeness rule, classify each as code/schema-enforced vs. discipline-only, decide case-by-case whether to harden. Three candidates already identified this session, not yet fixed: **Format Skill exclusivity** (`STANDARDS.md` §13 rule 14 — "content specialists never own Format Skills" — no schema constraint stops a future capability from violating it), **23-field agent completeness** (`STANDARDS.md` §11 — already caused a real production crash once, Victoria Chen/`RosterScreen`, before being written down reactively), **serverless function count** (Vercel Hobby 12-limit — tracked by manually running `find` and writing the number in each kickoff doc, no automated check). (2) Hardcoded agent-routing check — **already run 2026-07-02, clean**: grepped every file touched in the prior 2 days for `agent_id === 'x'`/`switch(capability_slug)`-style conditionals; zero hits in new code. The only match anywhere (`api/brief.js:73`, `agent_id === "pat"`) is pre-existing legacy code, untouched in this window — no action needed, do not re-litigate in the audit session unless new evidence surfaces.
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
