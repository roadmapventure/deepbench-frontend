# DeepBench v5.1 — Session Log & How to Start

> Last updated: 2026-06-07
> Google Drive retired as source of truth. GitHub is single master.

---

## The Two-Window Workflow

| Window | Tool | Reads | Does |
|--------|------|-------|------|
| Design + Planning | Claude.ai | GitHub docs via raw fetch | Writes kickoff docs, reviews mocks, design decisions |
| Coding | Claude Code | GitHub `CLAUDE.md` + `docs/` auto-read | Writes code, runs tests, commits to dev |

**You never write kickoff docs manually.** Ask Claude.ai to generate one. It
fetches GitHub docs and produces a fully self-contained kickoff doc rendered
as an **artifact panel** (copy icon accessible) — never as a download or raw
markdown. Paste it into Claude Code to start the session.

---

## How to Start a Coding Session

### Step 1 — Get the kickoff doc from Claude.ai

Open Claude.ai (DeepBench project) and say:

> "Generate the kickoff doc for [session name or feature ID]."

Claude.ai will fetch `CLAUDE.md`, `FEATURES.md`, `SESSIONS.md`, and
`STANDARDS.md` from GitHub, confirm current version and blockers, and
render the kickoff doc as an artifact panel.

### Step 2 — Run Claude Code

```
cd C:\Projects\deepbench-frontend
claude
```

### Step 3 — Paste the kickoff doc

Paste the kickoff doc. Claude Code reads `CLAUDE.md` automatically before
processing — it is already oriented. The kickoff doc tells it what to build.

### Step 4 — Claude Code executes

1. Read `CLAUDE.md` (automatic)
2. Read any additional files listed in kickoff doc Step 0
3. Run the Node.js test — ALL PASS required
4. Write the code
5. Run `npm run build` — zero errors required
6. Commit and push to `dev`
7. Update version state in `CLAUDE.md` Section 12 (automatic)
8. Report back with verification checklist and browser test results

### Step 5 — You run Manual QA

Open the dev URL, run the Manual QA checklist, report PASS/FAIL back to
Claude Code.

### Step 6 — Session closes

When all QA items pass, say "Close [FEATURE-ID]" to Claude Code.
Claude Code marks it Done in `FEATURES.md` and commits.

---

## How to Start a UX Review Session

UX review sessions happen in Claude.ai only — no Claude Code involved.

Open Claude.ai (DeepBench project) and say:

> "Starting UX review for [screen]. Generate the kickoff doc when ready."

Claude.ai fetches GitHub docs, asks you to describe or share a screenshot
of what you want changed, produces a mock or layout description for approval,
then writes the kickoff doc for the coding session that implements the changes.

---

## Kickoff Doc — 10 Required Sections

1. **SESSION** — name, version, branch, files to read in Step 0
2. **CONTEXT** — what the feature does and why
3. **STUB definitions** — e.g. `const MICHELLE = {...}` if needed
4. **TASKS** — max 4, each with exact code spec
5. **DESIGN RULES** — tokens, fonts, styling (required for UI sessions)
6. **SCOPE RULES** — what NOT to touch
7. **NODE.JS TEST** — full test code written out (not described)
8. **CLAUDE CODE VERIFICATION CHECKLIST** — from STANDARDS.md
9. **COMMIT instruction** — exact message format: `v5.1.X | FEATURE-ID | description`
10. **MANUAL QA CHECKLIST** — max 12 session-specific steps, ends with
    "Report back PASS/FAIL/NEW REQUIREMENT"

Claude Code has no memory and no Drive access. Kickoff doc must be
100% self-contained — no "as discussed" or "refer to standards."

---

## Current State

**Version in dev:** v5.1.17 (commit `8b40037`)
**Next session:** S16 — AI Audit implementation
**Do NOT merge dev → main** — John has not confirmed.

**Open blocking questions:**
- Q2: "Project vs Tasks" naming — resolved in S15a/b/c? Confirm before S16
- Q5: Agent step output destination — A, B, or C — BLOCKS S11
- Q-S16: Architect Checklist tab in AI Audit — in scope for S16 or deferred?

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
| S14p4 | v5.1.14p4 | 06aaa5b | Persist answers, remove ephemeral state, archived steps, initializeStepsFromSupabase | — |
| S14p4a | v5.1.14p4a | ed36639 | stepsToMerge → mergedToSet.active in setTask | — |
| S14p4b | v5.1.14p4b | 22b359e | Sync answers snapshot before Update Plan | — |
| S14p4c | v5.1.14p4c | 791d02a | Clean task.steps + retry planning agent | — |
| S14p4d | v5.1.14p4d | e3b7f9d | Clean stepsContext before LLM call | ✅ CLOSED |
| S15a | v5.1.15 | — | Work Dashboard UX — module naming, nav tabs, AIDiamond.jsx, CTA rename | ✅ CLOSED |
| S15b-A | v5.1.16 | — | Assign Work — terminology, nav cleanup, AI icons, CTA rename | ✅ CLOSED |
| S15b-B | v5.1.17 | — | Assign Work — Michelle humanized, per-step attribution, hover agent card | ✅ CLOSED |
| S15c | v5.1.17 | 8b40037 | Task Instructions — Steps header, nav removed, Update Steps CTA, HITL reposition | ✅ CLOSED |
| S16 | v5.1.17 base | — | AI Audit design complete — implementation pending | ⏳ NEXT |

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
| Update Steps button lives in StepList.jsx | S15c | NOT TaskInstructionsScreen.jsx |
| AIDiamond.jsx heartbeat component | S15a | Do not refactor without dedicated session |
| Fast-forward merge dev → main | S15 | Only after John explicit QA confirmation |
| Kickoff docs render as artifact panels | S15 | Never as downloads or raw markdown |
