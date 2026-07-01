# DeepBench — Current State
> Updated at the close of every session. **Keep this file short.** Only the current version, the next session, and the last 3 sessions (one line each) belong here. Full session history lives in `docs/SESSIONS.md` — read it only when you need version history or root-cause context from a past session, never by default.

**Version in dev:** v5.3.0

**Next session:** S-APPLE-01b — Knowledge corpus seed (5 datasets + 3 GEO briefings + 10 partner scenarios as knowledge_entries) + corpus versioning schema migration (`is_baseline`, `status`, `supersedes_id`, `confidence`, `override_flag`). Synthetic content still needs drafting before this session (see `docs/APPLE-AGENT-1-v5-DESIGN.md` §10b dependency note).

**Last 3 sessions:**
- S-APPLE-01a (v5.3.0, cfbf431, 2026-07-01) — AG-18–23 ✅ Done. 6 Apple Channel agents (Marcus, Priya, Nadia, Owen, Sam, Elena) added to `agents.js` + Supabase, all 23 fields + AVATAR_CFG + AGENT_PRONOUNS. 16/16 tests PASS, 9/9 QA PASS. Identity only — no capabilities/skill profiles/API routes yet (deferred to S-APPLE-02 through S-APPLE-05).
- S-APPLE-01a-design (v5.3.0, 2026-07-01) — Personas locked for all 6 Apple Channel agents. Kickoff doc written, no code touched.
- Apple v5 Redesign design (2026-06-30) — Market Intelligence rebuilt fully agent-driven, new 6-agent roster, 5-intent front-door model, corpus versioning design. Superseded prior 7-agent/4-schema model. Full spec: `docs/APPLE-AGENT-1-v5-DESIGN.md`.

Full history (all sessions before this window): `docs/SESSIONS.md`

**Branch rule:** NEVER merge `dev → main` without John's explicit sign-off.

---

## Open Blockers
- None. Q5 resolved 2026-06-13. CAPABILITIES.md + AI-SERVICES.md design complete.
- **Note:** S-INFRA-01 scope may need splitting into 01a (AI Services catalog + 6 extraction jobs) and 01b (capability registry, BYOK, two-speed routing). Decide before S-INFRA-01 design session.

---

## Session Queue (short view)

### Apple Demo Track
> Full design: `docs/APPLE-AGENT-1-v5-DESIGN.md`. No deadline-driven scope cuts by explicit direction — sequenced for correctness.
- S-APPLE-01a (v5.3.0) — 6 agent personas (identity only) in agents.js + Supabase `agents` rows: Marcus Webb, Priya Nair, Nadia Farouk, Owen Marsh, Sam Reyes, Elena Cho (AG-18/19/20/21/22/23) ✅ done (cfbf431)
- S-APPLE-01b — Knowledge corpus seed (5 datasets + 3 GEO briefings + 10 partner scenarios as knowledge_entries) + corpus versioning schema migration (`is_baseline`, `status`, `supersedes_id`, `confidence`, `override_flag` — design doc §7), seed rows get `is_baseline: true` — synthetic content to be drafted in Claude.ai before this session
- S-APPLE-02 — Front door: Intent Routing + Q&A Answer (GEO CSO Expert) + The Proofreader (Guardrail+Eval unified, `needs_review` two-layer rule) — design doc §5.1, 5.2, 5.7
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
