# DeepBench — Current State
> Updated at the close of every session. **Keep this file short.** Only the current version, the next session, and the last 3 sessions (one line each) belong here. Full session history lives in `docs/SESSIONS.md` — read it only when you need version history or root-cause context from a past session, never by default.

**Version in dev:** v5.3.10

**Next session:** S-APPLE-03a-2 — Priya: Stress Test (`hyp-stress-test-intent`, no schema of its own) + Alex: Intelligence Review Format Skill (`intelligence-review-format` on `screen-controls`, `AA-77`) + generalized format-last extension to `runCapability()`/`execute.js` (`format_skill_profile_slug`/`display_agent_id`). Kickoff doc ready: `docs/kickoffs/v5.3.11-S-APPLE-03a-2-stress-test-format-skill.md`.

**Then:** S-APPLE-03b (Sam/`pipeline-triage`, pure Skill Profile data).

**Last 3 sessions:**
- S-APPLE-03a-2-design (v5.3.11, 2026-07-02) — Design-only, confirmed with John: Priya's Stress Test must actually call Alex for formatting — not ship as inert Format Skill data — per `ARCHITECTURE.md` §13 rule 14 (content specialists never own Format Skills). Found the only existing "attach a display agent's Format Skill to another agent's call" mechanism (`api/plan.js`'s `AA-69` pattern) is hardwired to Work Orders and duplicated twice in that file — Priya's call runs through the generic `execute.js`, which has no equivalent. Resolved by generalizing it into `runCapability()` itself (two new optional params) rather than deferring the plumbing to `S-MARKET-INTEL-01`; `plan.js` left unmodified (dedup is a future cleanup, not this session). Locked: `hyp-stress-test-intent` carries no `traits.schema` — the full 8-field Intelligence Review schema lives entirely on `intelligence-review-format`. `ARCHITECTURE.md` §19b's documented `runCapability()` signature to be updated alongside the code (LOCKED section, extension confirmed with John, not unilateral). Kickoff doc: `docs/kickoffs/v5.3.11-S-APPLE-03a-2-stress-test-format-skill.md`. No code touched.
- S-APPLE-03a-1 (v5.3.10, a18570e, 2026-07-02) — `AG-28` 🔶 Partial (Generate Hypotheses done, Stress Test pending). `hypothesis-evaluation` capability + `hyp-identity`/`hyp-behavior`/`hyp-knowledge`/`hyp-generation-intent` + Priya's assignment, all live in Supabase, mirroring `channel-intelligence` exactly. `hyp-knowledge.traits.broker: "librarian"` — same credential-checked mechanism as Marcus, no direct Data Room access. Zero new route file — runs through the existing generic `execute.js` pipeline. Serverless count unchanged at 11. **QA verified directly by Claude** (John delegated manual QA to Claude this session, a deviation from the usual John-runs-it gate): all 9 checklist items confirmed against live Supabase + the deployed dev URL post-push — live `execute.js` call produced 4 genuinely distinct, falsifiable hypotheses for the EMEA co-op scenario; AI Audit By Service/By Agent both confirmed showing the new row only after commit+push+deploy (first QA pass showed item 6 FAIL because the code was still uncommitted/gated behind the QA checklist itself — root-caused as a sequencing gap, not a bug, re-verified PASS after push). Item 9 (Vercel function logs) accepted on indirect evidence — no Vercel CLI/MCP access in this environment, same acceptance basis as `S-CAPABILITY-EXEC-02`.
- S-APPLE-03a-1-design (v5.3.10, 2026-07-02) — Design-only, confirmed with John: (1) AA-70 (category-based RAG filtering) deferred again — plain agent-scoped RAG access is enough, no code change. (2) Hypothesis validity/off-topic detection (stress-test finding #4) explicitly deferred, logged as new `AA-78` roadmap item, not built. (3) Intelligence Review Format Skill lands on Alex/`screen-controls` (fixed-shape dashboard card), not Riley/`html-display` — logged as new `AA-77`. (4) Full `hypothesis-evaluation` capability split into `S-APPLE-03a-1` (Generate Hypotheses, this kickoff doc) and `S-APPLE-03a-2` (Stress Test) per the max-4-tasks rule. Verified live via Supabase: no `hypothesis-evaluation` capability/`hyp-*` skill profiles/Priya assignment exist yet; Priya's `data_room_access` already includes `apple-cso-data-room`, matching Marcus's — Librarian broker needs zero new credential setup, only the `traits.broker: "librarian"` trait on `hyp-knowledge`. New feature ID logged: `AG-28` (capability build, both parts). Kickoff doc: `docs/kickoffs/v5.3.10-S-APPLE-03a-1-hypothesis-generation.md`. No code touched.

Full history (all sessions before this window): `docs/SESSIONS.md` (S-CAPABILITY-EXEC-02, S-CAPABILITY-EXEC-02-design, S-CAPABILITY-EXEC-01, S-APPLE-03-design, S-APPLE-02c, S-APPLE-02c-design, S-APPLE-02b, S-APPLE-02b-design — have rolled out of this window; see SESSIONS.md for full detail)

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
- S-APPLE-03a-2 — Priya: Stress Test (`hyp-stress-test-intent`, no schema) + Alex: Intelligence Review Format Skill (`intelligence-review-format`, `AA-77`) + generalized format-last extension to `execute.js` — design doc §5.4 — kickoff doc ready (`docs/kickoffs/v5.3.11-S-APPLE-03a-2-stress-test-format-skill.md`), not yet coded
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
