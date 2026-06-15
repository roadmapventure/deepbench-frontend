# DeepBench — Current State
> Updated at the close of every session.

**Version in dev:** v5.2.0
**Next session:** S-AI-AUDIT-REDESIGN — Design session: rebuild AI Audit screen on the AI Services model. Five new sections: By Service / By Pattern / Deterministic / By LLM / By Agent. Read `docs/AI-SERVICES.md` Sections 2, 3, and 6 before starting. Also read AI-23, AI-25, AI-26 in FEATURES.md. After this session: S-DELIVER-DESIGN Part 3 (kickoff docs for S11 + S-DELIVER-04).
**Last session:** S-DELIVER-DESIGN Part 2 (continued) — AI Services Model designed and locked in `docs/AI-SERVICES.md`. Full 14-service catalog (SVC-01 through SVC-14: 11 AI/Mixed + 3 Deterministic). AI Patterns catalog (PAT-01 through PAT-10). Unified Services table schema. Five redesigned AI Audit sections. MCP exposure surfaces (MC-01 through MC-07). Service Versioning and Service Health design. ARCHITECTURE.md Section 2 Method Layer renamed to AI Pattern Layer. CAPABILITIES.md Methods renamed to AI Services throughout. FEATURES.md: AI-23 updated, AI-25/26/27 added, MC section added (7 items), S-AI-AUDIT-REDESIGN added to session queue.
**Branch rule:** NEVER merge `dev → main` without John's explicit sign-off.

---

## Open Blockers
- None. Q5 resolved 2026-06-13. CAPABILITIES.md + AI-SERVICES.md design complete.
- **Note:** S-INFRA-01 scope may need splitting into 01a (AI Services catalog + 6 extraction jobs) and 01b (capability registry, BYOK, two-speed routing). Decide before S-INFRA-01 design session.

---

## Session Queue (short view)
- S-MIGRATE-02 — Training tab: load/toggle/delete wiring + NIGP card layout ✅ done (02ff560)
- S-MIGRATE-03 — Training tab: Add Courses inline sub-view ✅ done (686007e)
- S-MIGRATE-04 — Training tab: Edit Course inline sub-view ✅ done (732bf3c)
- S-MIGRATE-05 — Playbook tab: output_format CRUD + guardrails ✅ done (1644366)
- S-AVATAR-01 — Avatar consistency sweep ✅ done (d9d43c2)
- S-MIGRATE-06 — Test Agent console (PE-12, needs design session)
- S-BENCH-UX-01 — Bench UI polish ✅ done (812ed59)
- S-BENCH-UX-02 — Bench UI polish round 2 ✅ done (8717106)
- S-AI-ATTR-01 — Capability-agent attribution Michelle + Susan ✅ done (4d568bd)

Full session queue and feature backlog: `docs/FEATURES.md`
Full architecture decisions: `docs/ARCHITECTURE.md`
