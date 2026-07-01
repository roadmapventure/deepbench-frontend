# DeepBench — Current State
> Updated at the close of every session. **Keep this file short.** Only the current version, the next session, and the last 3 sessions (one line each) belong here. Full session history lives in `docs/SESSIONS.md` — read it only when you need version history or root-cause context from a past session, never by default.

**Version in dev:** v5.3.4

**Next session:** S-APPLE-02 — Front door: Intent Routing + Q&A Answer (GEO CSO Expert) + The Proofreader. Design doc §5.1, 5.2, 5.7. Marcus's Q&A Answer call goes through Eleanor (`fetch_instruction.broker:"librarian"`), not a raw `queryRAG()` scope param. Needs its own design session — no kickoff doc yet.

**Last 3 sessions:**
- S-LIBRARIAN-01c (v5.3.4, 3489219, 2026-07-01) — AA-73 ✅ Done. `PromptEvolutionModal.jsx`: `<AgentAvatar who="dan" size={18} ring={false} />` added immediately before the existing "Dan Bingham PS-01" text chip, matching the `StepList.jsx` precedent exactly. `AVATAR_CFG.dan` already existed — pure 1-file JSX retrofit, no config change. 6/6 Node test PASS, build zero errors, both independently re-run rather than trusted from the report. Diff read directly against the kickoff doc spec — exact match, zero unrelated lines touched. Avatar rendering confirmed indirectly: the identical `AgentAvatar who="dan"` component verified rendering correctly (glasses, moss border) on the live Bench screen. Full live plan-generation click-through (Manual QA item 1) couldn't be exercised via local `vite dev` (no Vercel serverless functions locally, `/api/plan` 500s) — John confirmed PASS directly. 7/7 Manual QA PASS.
- S-LIBRARIAN-01c-design (v5.3.4, 2026-07-01) — Kickoff doc written for AA-73's Dan Bingham avatar retrofit. Locked the AA-73 rule into `STYLE-GUIDE.md` Section 17 (Agent Avatar Visibility Rule) — was named during S-LIBRARIAN-01a-design but never written down until now. No code touched.
- S-LIBRARIAN-01b (v5.3.3, 36bff57, 2026-07-01) — AG-27 wiring ✅ Done. `api/prompt/ai-enrichment.js`: `fetchSection()` routes through `queryLibrary()` when `fetch_instruction.broker === "librarian"`; default (unset) path byte-identical to pre-session behavior for every existing caller — no Skill Profile sets it yet, so zero production behavior change until S-APPLE-02/03 opt in. `lib/librarian.js`: `ai_type` fixed from `"deterministic"` (unattributable) to `"librarian"`. `useAIActivity.js`: `SERVICE_CATALOG` + `AI_TYPE_TO_SERVICE` entries added. 12/12 QA PASS — independently re-verified rather than trusting the completion report at face value: code diff read directly (matches kickoff doc exactly), `npm run build` re-run locally (zero errors), Supabase `ai_activity_log` queried directly (2 new rows, `ai_type:"librarian"`, ~269ms apart — matches the Node test's 2 broker calls exactly, isolated from 3 older mistyped rows), and the live dev URL checked directly in-browser: AI Audit panel shows "The Librarian" under By Service (Hybrid · RAG · 2 calls) and "Eleanor Voss LB-01" under By Agent, zero console errors, live Marcus chat exchange confirmed no regression.

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
