# DeepBench — Current State
> Updated at the close of every session.

**Version in dev:** v5.2.0
**Next session:** S-AI-AUDIT-REDESIGN coding — kickoff doc at `docs/kickoffs/v5.2.1-AI23-ai-audit-redesign.md`. Read it and CLAUDE-STATE.md then execute. After coding session closes: S-DELIVER-DESIGN Part 3 (kickoff docs for S11 + S-DELIVER-04).
**Last session:** S-AI-AUDIT-REDESIGN design — Full layout locked. By Service (14 services, type badge AI/Hybrid/Logic, patterns inline, calls/cost/latency), By Pattern (10 industry patterns catalog, inactive greyed), By LLM + By Agent unchanged, Roadmap collapsed (Services Now/Next/Later + Patterns Now/Next/Later). New MCP Roadmap tab (7 surfaces, tier badges, bidirectional callout). Header strip expanded to 5 stats (Services Active X/14 + Patterns Active 8/10). Old ai_type strings remapped client-side via AI_TYPE_TO_SERVICE — no DB migration needed. ai_services + ai_patterns tables deferred to S-INFRA-01. AI-23 marked Designed. Kickoff doc: v5.2.1-AI23-ai-audit-redesign.md.
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
