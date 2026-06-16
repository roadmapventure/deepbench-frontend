# DeepBench — Current State
> Updated at the close of every session.

**Version in dev:** v5.2.9
**Next session:** S-RENAME-01 (pre-requisite before any Work Order coding) or S-AI-BADGE-02/03.
**Last session:** S-AI-PATTERN-TYPE-01p patch (26ff072) — AI-36p complete. Reflection removed from all 4 SERVICE_CATALOG patterns arrays (prompt-assembly, knowledge-reinforcement, pre-run-planning, persona-replication). M-P3 test caught 2 additional services beyond patch scope. 29 tests PASS. Prior: S-AI-PATTERN-TYPE-01 coding (22c9d2e) — AI-36 complete. patternType (structural|reasoning) added to all 20 PATTERN_CATALOG entries. Reflection removed from 4 AiBadge labels (PROMPT_ASSEMBLY, KNOWLEDGE_REINFORCEMENT, AI_REVIEW, CREATE_TASK_FULL). By Pattern section split into Structural/Reasoning subsections. 175 Node.js tests PASS, build zero errors. Prior: S-AI-PATTERN-TYPE-01 design (2026-06-16) — AI-36 designed. Also: S-DELIVER-DESIGN Part 3 prior — Full platform entity design session (2026-06-16). Produced: WORK-ORDER-MODEL.md, DELIVERABLE-MODEL.md, INTENT-MODEL.md, FORMAT-MODEL.md, PLATFORM-ENTITIES.md (all new). Updated ARCHITECTURE.md (Deliverables Competency removed; Three Competencies diagram). Updated FEATURES.md (WO/IN/FM/SV area codes + feature sections + new session queue entries). 9 Intents defined as DeepBench MCP service categories. Format→Intent locked cardinality confirmed. Entity Independence Principle established. Shared Property Set + Universal Profile Structure documented. Terminology rename cascade identified (S-RENAME-01 required). Prior: S-AI-AUDIT-UX-01 coding (c919af4) — AI-32 By Pattern inactive collapse card + AI-33 Platform Roadmap Next/Later 2-column redesign. 21 Node.js tests PASS, build zero errors. S-AI-AUDIT-UX-01 design prior — Platform Roadmap scoped to Next + Later only (no Now — all active services/patterns already coded). AI Pattern Check process locked into CLAUDE-DESIGN.md + STANDARDS.md (mandatory Section 3 in all kickoff docs going forward). S-AI-BADGE-05/05p prior: AI-31 functionally complete (195aeda) but visual treatment wrong (raw dot+AiBadge instead of AIDiamond). Redesign of AI-31 + AI-34 deferred. Prior: S-AI-BADGE-04 ✅ done (5c2b8d2) — PATTERN_CATALOG expanded from 10 to 20 entries (PAT-11–20 added), hitlSpecial flag on PAT-10 HITL (Gates Triggered / Avg Response Time columns, 🔶 Partial · TI-18 required chip), partial flag on PAT-14 Parallelization (🔶 Partial · TT-01/02 chip), header stat 8/10 → 8/20 (dynamic via patternsCatalogTotal). Platform Roadmap AI Patterns auto-renders 12 inactive entries. 19 Node.js tests PASS, build zero errors. AI-30 ✅ Done. Prior: S-AI-BADGE-03 ✅ done (8d63915) — PersonnelScreen (4 badges: KNOWLEDGE_TRAINING × 3, PROMPT_ASSEMBLY × 1), ResumeTab (2 badges: PROMPT_ASSEMBLY × 2), RosterScreen (1 badge: KNOWLEDGE_TRAINING × 1). All 7 Node.js tests PASS, build zero errors. AI-28 ✅ Done. Prior: S-AI-BADGE-02 ✅ done (b03d04e) — AssignWorkScreen: 5 AI-28 label replacements (TASK_PLANNING × 5) + AI-29 StepCard conditional agentEntry badge (agent type chip, agent name byline, SUB-AGENT chip). AIReviewTab: AI_REVIEW label (AI-28). All 14 Node.js tests PASS, build zero errors. AI-28 🔶 Partial (S-AI-BADGE-03 remaining). AI-29 ✅ Done. Prior: S-AI-BADGE-01 ✅ done (a6d00c9) — aiPatterns.js created (AI_PAT constants + AGENT_PATTERNS map), AiBadge `built` prop added (greyed/dashed for unbuilt patterns), FlagCard AI badge removed (SVC-12 deterministic), DashboardScreen: 3 label replacements (CHAT_RESPONSE × 2, AGENT_ROUTING × 1) + DB-22 Create New Task badge (CREATE_TASK_FULL). All 9 Node.js tests PASS, build zero errors. All 12 Manual QA items PASS. DB-22 ✅ Done. AI-28 🔶 Partial (S-AI-BADGE-02/03 remaining). Prior: S-AI-BADGE-DESIGN (continued) — AI pattern catalog expanded to 20 patterns (PAT-12–20 added to AI-SERVICES.md). AI-26 updated to 20-pattern seed. AI-30 added (AI Audit catalog expansion). TT-03 added (Multi-Agent Debate upgrade). S-AI-BADGE-04 added to session queue. Four badge coding sessions planned: S-AI-BADGE-01/02/03/04. Test Team (TT-01/02) correctly identified as PAT-14 Parallelization partial implementation — foundation for PAT-16 Multi-Agent Debate (TT-03). S-DELIVER-DESIGN Part 3 deferred until after badge sessions. Prior: S-AI-AUDIT-REDESIGN complete (da40458 + f0ecd09) — AI Audit rebuilt on AI Services model. AI-23 ✅ Done. Kickoff doc: v5.2.1-AI23-ai-audit-redesign.md.
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
