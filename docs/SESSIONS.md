# DeepBench v5.1 — Session Log & How to Start

> For the live session queue, always check Google Drive first.
> Queue Doc ID: `1izzrv7pF7lLZSAlV-AAwWLVh_uGKGrNGioqva1YXSn4`
> This file is a reference log and quick-start guide.

---

## Current State

**Version in dev:** v5.1.14p4d (commit `e3b7f9d`)
**Next session:** S15a — Dashboard UX Review
**Do NOT merge dev → main** — John has not confirmed.

---

## How to Start a Coding Session (Claude Code)

```
1. cd C:\Projects\deepbench-frontend && claude
2. Claude Code reads CLAUDE.md automatically (it's in repo root)
3. Paste kickoff doc
4. Run tests, commit, report QA
```

**What Claude Code knows automatically** (from CLAUDE.md):
- Stack, repos, branch strategy
- Design system tokens
- Agent roster and Michelle stub
- Step state architecture
- AI call rules
- Pre-commit checklist

**What you still need to paste in the kickoff doc:**
- The specific feature you're building (from Feature Inventory)
- The exact files to modify
- The session's Node.js test (written out in full)
- The session-specific Manual QA checklist

---

## How to Start a UX Review Session (Claude.ai)

Open a fresh Claude.ai conversation and say:

> "Starting [S15a/b/c] UX review — [Screen]. Fetch Queue ID
> 1izzrv7pF7lLZSAlV-AAwWLVh_uGKGrNGioqva1YXSn4 and PRD ID
> 1zkz7EdnMoNHHoGRLEu6dQdiz1iUGdEQsJ5HlWzOCZhE and Mock ID
> 1uY9IMXwHoMfKFdeK9cUlMnjIiHhhWGbuxFFNs8q6WZI.
> I will describe the UX updates I want."

---

## Session Log

| Session | Version | Commit | Description | QA |
|---------|---------|--------|-------------|-----|
| S01–S09p | v5.1.0–v5.1.8 | — | Core platform built | ✅ |
| S10a | v5.1.9 | eab57c2 | Step merge + visual design | ✅ 9 passed |
| S10b | v5.1.10 | 4900273 | AG-04 Michelle UI presence | ✅ 11 passed |
| S10p | v5.1.10p | 0be479b | AG-04a avatar + AG-04b thinking | ✅ 11 passed |
| S14 | v5.1.14 | 1fca2bb | DB-17 Michelle title generation | — |
| S14p | v5.1.14p | fc62f6a | Hover, step editing, layout, persist, dedup | — |
| S14p2 | v5.1.14p2 | 9be3807 | Step init rewrite, pendingArchive, card layout | — |
| S14p2a | v5.1.14p2 | ed36639 | setTask steps fix | — |
| S14p3 | v5.1.14p3 | 3d93101 | Preserve unanswered HITL on Update Plan | — |
| S14p4 | v5.1.14p4 | 06aaa5b | Persist answers, remove ephemeral state, archived steps fix, initializeStepsFromSupabase | — |
| S14p4a | v5.1.14p4a | ed36639 | stepsToMerge → mergedToSet.active in setTask | — |
| S14p4b | v5.1.14p4b | 22b359e | Sync answers snapshot before Update Plan | — |
| S14p4c | v5.1.14p4c | 791d02a | Clean task.steps + retry planning agent | — |
| S14p4d | v5.1.14p4d | e3b7f9d | Clean stepsContext before LLM call | ✅ CLOSED |

---

## Architectural Decisions Log

Locked decisions made during sessions. Do not reverse without product approval.

| Decision | Session | Detail |
|----------|---------|--------|
| No hardcoded selectors | S01 | Agents learn through training |
| Client-side CSV processing | S01 | Compliance advantage — no server upload needed for analysis |
| Single-shot LLM for most tasks | S01 | Agentic only when step N+1 needs step N output |
| Agent execution uses existing api/brief.js | S01 | Not rewritten |
| Pat runs Railway backend with skipRag=true | S03 | Same backend as Brent |
| Michelle logic lives in Supabase agent_configs | S10b | NOT in code |
| api/plan.js + api/title.js read from Supabase | S10b | Locked to S-BENCH-01 |
| mergeSteps() = single source of truth | S10a | Three named operations only |
| Three named step operations | S14p2 | initializeFromSupabase, initializeFromFirstPlan, updateFromPlan |
| saveStepsToSupabase() writes full array | S14p2 | Including archived |
| pendingArchive preserved in all writes | S14p2 | Stripped only on user approve |
| Answers on step.questions[n].a | S14p4 | Never ephemeral state |
| stepsContext strips mergeStatus/pendingArchive/title_edited | S14p4d | Before LLM call |
| task.steps = mergedToSet.active after Update Plan | S14p4c | — |
| MichelleAvatar.jsx stub | S10p | Supabase profile wiring = S-BENCH-01 |
| title_edited flag | S14 | User owns title after first edit, never overwritten |
