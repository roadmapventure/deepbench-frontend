# DeepBench — Current State
> Updated at the close of every session. **Keep this file short.** Only the current version, the next session, and the last 3 sessions (one line each) belong here. Full session history lives in `docs/SESSIONS.md` — read it only when you need version history or root-cause context from a past session, never by default.

**Version in dev:** v5.3.14

**Next session:** S-APPLE-04a-design — Data Expert Escalate (§5.5). Apple Demo Track resumes; the Structural Enforcement Track (spawned by `S-ARCH-AUDIT-01-design`) is deliberately interleaved later, not blocking — no SE- item is a prerequisite for Apple track work, since the manual Architect Review process already covers the same rules SE-01–05 would automate. See Session Queue below for both tracks.

**Then:** S-APPLE-04b (Data Integrity Patch, §5.6) → S-APPLE-04c (Demo Reset mechanism only, §7 — UI control deferred to S-MARKET-INTEL-01/03) → S-APPLE-05 (The Reasoner — Memory Consolidation + loop-closure verification) → Structural Enforcement Track (S-ARCH-ENFORCE-03 → 04 → 01 → 02 → 05, see below) → S-MARKET-INTEL-01/02/03.

**Last 3 sessions:**
- S-ARCH-AUDIT-01-design (v5.3.14, 2026-07-02) — Design-only. Walked every `ARCHITECTURE.md` LOCKED section + `STANDARDS.md` completeness rule; classified each as code/schema-enforced vs. discipline-only. 5 new `SE-` (Structural Enforcement) backlog items logged to `FEATURES.md`, sequenced as their own track below. Full detail: `docs/SESSIONS.md`.
- S-LIBRARIAN-03 (v5.3.14, c3b0d72, 2026-07-02) — `AG-30` ✅ Done. `the_Library`/`data_rooms` tables built, `knowledge_entries` reverted to 34 rows, `lib/librarian.js` rewritten. Full detail: `docs/SESSIONS.md`.
- S-LIBRARIAN-03-design (v5.3.14, 2026-07-02) — Design-only. Locked `ARCHITECTURE.md` §19c (`the_Library` vs `knowledge_entries` split). Full detail: `docs/SESSIONS.md`.

Full history (all sessions before this window): `docs/SESSIONS.md` (S-LIBRARIAN-02, S-APPLE-04-design, S-APPLE-03b, S-APPLE-03b-design, S-APPLE-03a-2, S-APPLE-03a-2-design, S-APPLE-03a-1, S-APPLE-03a-1-design, S-CAPABILITY-EXEC-02, S-CAPABILITY-EXEC-02-design, S-CAPABILITY-EXEC-01, S-APPLE-03-design, S-APPLE-02c, S-APPLE-02c-design, S-APPLE-02b, S-APPLE-02b-design — have rolled out of this window; see SESSIONS.md for full detail)

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
