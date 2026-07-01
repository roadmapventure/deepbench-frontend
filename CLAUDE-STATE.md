# DeepBench — Current State
> Updated at the close of every session. **Keep this file short.** Only the current version, the next session, and the last 3 sessions (one line each) belong here. Full session history lives in `docs/SESSIONS.md` — read it only when you need version history or root-cause context from a past session, never by default.

**Version in dev:** v5.3.4

**Next session:** S-APPLE-02a — Serverless budget prep: merge `api/ingest.js` + `api/load-entries.js` into one route (frees 1 slot, 12→11) so S-APPLE-02b has room to add `api/capabilities/channel-intelligence.js`. Kickoff doc ready: `docs/kickoffs/v5.3.5-S-APPLE-02a-knowledge-entries-merge.md`.

**Then:** S-APPLE-02b — GEO CSO Expert (Marcus/CI-01) Intent Routing + Q&A Answer capability (design doc §5.1, 5.2 / FEATURES.md MI-10, MI-11). Needs its own design session — must spec the `assemblePrompt()` per-call Intent Skill Profile filter (`ARCHITECTURE.md` §2 known gap) before writing tasks.
**Then:** S-APPLE-02c — The Proofreader quality-gate capability (design doc §5.7 / FEATURES.md MI-12). Needs its own design session — must resolve its own serverless-budget slot and the `llm-as-judge` `PATTERN_CATALOG` fix (see MI-12).

*(S-APPLE-02 as originally queued was one entry covering all three — split 2026-07-01 during S-APPLE-02a-design after Architect Review found the combined scope exceeded both the max-3-files rule and the 12-function Vercel Hobby ceiling. See `docs/kickoffs/v5.3.5-S-APPLE-02a-knowledge-entries-merge.md` Section 2 for the full reasoning.)*

**Last 3 sessions:**
- S-APPLE-02a-design (v5.3.5, 2026-07-01) — Architect Review for S-APPLE-02 (Front door: Intent Routing + Q&A + Proofreader) found: (1) `ARCHITECTURE.md` §2 was stale — `skill_profiles`/`capabilities`/etc. tables are live now, not gated behind S-INFRA-01, corrected in place; (2) `assemblePrompt()` has no per-call Intent Skill Profile filter, a real gap for any capability with 2+ Intent Skills — CI-01's channel-intelligence capability is the first to hit it; (3) design doc's Eval "PAT-19" label doesn't match any real `PATTERN_CATALOG` slug — the real match is `llm-as-judge` (`active:false`), correction logged to MI-12; (4) serverless function count is 12/12 (Vercel Hobby ceiling), not 11 as last stated — needs a merge before any new route. Split S-APPLE-02 into 02a/02b/02c. Wrote kickoff doc for 02a only (the merge); 02b/02c each need their own design session. No code touched.
- S-LIBRARIAN-01c (v5.3.4, 3489219, 2026-07-01) — AA-73 ✅ Done. `PromptEvolutionModal.jsx`: `<AgentAvatar who="dan" size={18} ring={false} />` added immediately before the existing "Dan Bingham PS-01" text chip, matching the `StepList.jsx` precedent exactly. `AVATAR_CFG.dan` already existed — pure 1-file JSX retrofit, no config change. 6/6 Node test PASS, build zero errors, both independently re-run rather than trusted from the report. Diff read directly against the kickoff doc spec — exact match, zero unrelated lines touched. Avatar rendering confirmed indirectly: the identical `AgentAvatar who="dan"` component verified rendering correctly (glasses, moss border) on the live Bench screen. Full live plan-generation click-through (Manual QA item 1) couldn't be exercised via local `vite dev` (no Vercel serverless functions locally, `/api/plan` 500s) — John confirmed PASS directly. 7/7 Manual QA PASS.
- S-LIBRARIAN-01c-design (v5.3.4, 2026-07-01) — Kickoff doc written for AA-73's Dan Bingham avatar retrofit. Locked the AA-73 rule into `STYLE-GUIDE.md` Section 17 (Agent Avatar Visibility Rule) — was named during S-LIBRARIAN-01a-design but never written down until now. No code touched.

Full history (all sessions before this window): `docs/SESSIONS.md`

**Branch rule:** NEVER merge `dev → main` without John's explicit sign-off.

---

## Open Blockers
- None. S-APPLE-01b's `geo`/`program_area`/`partner_id`/`period` column decision resolved 2026-07-01 (added as 4 real columns, folded into Task 1's migration).
- None. The "shared agent_id" Data Room scoping question (was open, blocking S-APPLE-02) resolved 2026-07-01 via AG-27 The Librarian — superseded by the `queryLibrary()` broker mechanism, not answered directly. See S-LIBRARIAN-01a kickoff doc.
- Q5 resolved 2026-06-13. CAPABILITIES.md + AI-SERVICES.md design complete.
- **Note:** S-INFRA-01 scope may need splitting into 01a (AI Services catalog + 6 extraction jobs) and 01b (capability registry, BYOK, two-speed routing). Decide before S-INFRA-01 design session.
- **S-APPLE-02b design session must resolve:** exact shape of the `assemblePrompt()` per-call Intent Skill Profile filter (new optional param, e.g. `intent_slug`) before writing tasks — see `ARCHITECTURE.md` §2 known gap.
- **S-APPLE-02c design session must resolve:** which second `api/` merge/consolidation frees a slot for `quality-gate.js` (02a's merge only buys one slot, spent by 02b), and the `llm-as-judge` `PATTERN_CATALOG` active flip — see FEATURES.md MI-12.

---

## Session Queue (short view)

### Apple Demo Track
> Full design: `docs/APPLE-AGENT-1-v5-DESIGN.md`. No deadline-driven scope cuts by explicit direction — sequenced for correctness.
- S-APPLE-01a (v5.3.0) — 6 agent personas (identity only) in agents.js + Supabase `agents` rows: Marcus Webb, Priya Nair, Nadia Farouk, Owen Marsh, Sam Reyes, Elena Cho (AG-18/19/20/21/22/23) ✅ done (cfbf431)
- S-APPLE-01b — Data Room seed (20 rows) + versioning/confidence-tier schema migration (10 new columns) ✅ done (7dbba0b)
- S-LIBRARIAN-01a — Eleanor Voss (LB-01) persona + `lib/librarian.js` `queryLibrary()` broker ✅ done (542b1fe)
- S-LIBRARIAN-01b — `ai-enrichment.js` `broker` opt-in wiring + AI Audit `ai_type` fix (`lib/librarian.js`) + `SERVICE_CATALOG`/`AI_TYPE_TO_SERVICE` entries ✅ done (36bff57)
- S-LIBRARIAN-01c — Dan Bingham avatar retrofit (AA-73) ✅ done (3489219)
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
