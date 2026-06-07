# DeepBench v5.1 — Session Log & How to Start

> Last updated: 2026-06-07

---

## The Two-Window Workflow

DeepBench development uses two Claude windows with distinct roles:

| Window | Tool | Reads | Does |
|--------|------|-------|------|
| Design + Planning | Claude.ai | Google Drive (PRD, Feature Inventory, Mock, Queue) | Writes kickoff docs, updates Drive, reviews mocks |
| Coding | Claude Code | GitHub (`CLAUDE.md` + `docs/`) | Writes code, runs tests, commits to dev |

**You never write kickoff docs manually.** You ask Claude.ai to generate one, it reads Drive and produces a fully self-contained doc, and you paste it into Claude Code. Claude Code needs nothing from Drive — everything it needs is in GitHub.

---

## How to Start a Coding Session

### Step 1 — Get the kickoff doc from Claude.ai

Open Claude.ai and say:

> "Generate the kickoff doc for [session name or feature ID]. Read the Session Queue, Feature Inventory, PRD, and Mock from Drive first."

Claude.ai will:
- Fetch all four Drive docs
- Confirm any pending decisions or blockers
- Cross-reference PRD and Mock for the feature
- Write a fully self-contained kickoff doc with all 10 required sections

### Step 2 — Run Claude Code

```
cd C:\Projects\deepbench-frontend
claude
```

### Step 3 — Paste the kickoff doc

Paste the kickoff doc Claude.ai generated. Claude Code reads `CLAUDE.md` automatically before processing your prompt, so it is already oriented. The kickoff doc just tells it what to build this session.

### Step 4 — Claude Code executes

Claude Code will:
1. Read `CLAUDE.md` (automatic)
2. Read any additional files listed in the kickoff doc Step 0
3. Run the Node.js test
4. Write the code
5. Run `npm run build`
6. Commit and push to `dev`
7. Report back with the verification checklist and browser test results

### Step 5 — You run Manual QA

Open the dev URL, run the Manual QA checklist from the kickoff doc, and report PASS/FAIL back to Claude Code.

### Step 6 — Session closes

When all QA items pass, tell Claude.ai to update the Session Queue and Feature Inventory in Drive with the session results.

---

## How to Start a UX Review Session

UX review sessions happen in Claude.ai only — no Claude Code involved.

Open Claude.ai and say:

> "Starting [S15a/b/c] UX review for [Screen]. Please fetch the Session Queue, PRD, Feature Inventory, and Mock from Drive."

Claude.ai will read the mock, ask you to describe what you want changed, produce updated designs or layout descriptions, and write the resulting kickoff doc for the coding session that implements the changes.

---

## Kickoff Doc — 10 Required Sections

Every kickoff doc must have these in order:

1. **SESSION** — name, version, branch, files to read in Step 0
2. **CONTEXT** — what the feature does and why
3. **STUB definitions** — e.g. `const MICHELLE = {...}` if needed
4. **TASKS** — max 4, each with exact code spec
5. **DESIGN RULES** — tokens, fonts, styling (required for UI sessions)
6. **SCOPE RULES** — what NOT to touch
7. **NODE.JS TEST** — full test code written out (not described)
8. **CLAUDE CODE VERIFICATION CHECKLIST** — from STANDARDS.md
9. **COMMIT instruction** — exact message
10. **MANUAL QA CHECKLIST** — max 12 session-specific steps, ends with "Report back PASS/FAIL/NEW REQUIREMENT"

Claude Code has no memory and no Drive access. The kickoff doc must be 100% self-contained — no "as discussed" or "refer to standards" references.

---

## Current State

**Version in dev:** v5.1.14p4d (commit `e3b7f9d`)
**Next session:** S15a — Dashboard UX Review
**Do NOT merge dev → main** — John has not confirmed.

**Open blocking questions:**
- Q2: "Project vs Tasks" naming — address during S15a/b/c UX reviews
- Q5: Agent step output destination — A, B, or C — BLOCKS S11

---

## Session Log

| Session | Version | Commit | Description | QA |
|---------|---------|--------|-------------|-----|
| S01–S09p | v5.1.0–v5.1.8 | — | Core platform built | ✅ |
| S10a | v5.1.9 | eab57c2 | Step merge + visual design | ✅ 9 passed |
| S10b | v5.1.10 | 4900273 | AG-04 Michelle UI presence | ✅ 11 passed |
| S10p | v5.1.10p | 0be479b | AG-04a avatar + AG-04b thinking state | ✅ 11 passed |
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

| Decision | Session | Detail |
|----------|---------|--------|
| No hardcoded selectors | S01 | Agents learn through training |
| Client-side CSV processing | S01 | Compliance advantage |
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
