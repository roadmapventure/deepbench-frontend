<!-- DeepBench v7.0.99 | GOVERNANCE-MODES.md | SES-78 series -- governance-mode registry, created by discovery design-selfbuilding-0819 (2026-08-19). Extensible by rows, never rewrites. -->
# Governance-Mode Registry

> Created by discovery `design-selfbuilding-0819` (John, 2026-08-19). Governing architecture:
> `docs/ARCHITECTURE.md` §19v. **This registry is extensible by rows** — a future mode is a new
> row and a new section, never a rewrite of an existing one. Renaming a mode is John's call
> (Tier 3).

Every session on this repo runs under exactly one governance mode. The mode decides **when
John's judgment is exercised** — during the work, the morning after on evidence, or not at all
(non-DeepBench work). It never changes the shared invariants.

## The registry

| Mode | Judgment point | Selection | Status |
|---|---|---|---|
| **Manual Design & Build** | During the work — design conversation, walkthrough gates, kickoff docs, John's approvals live | **Default.** A human in the chat *is* the selection; no session is ever asked "which mode?" | Active (today's process) |
| **Automated** | The morning after, on evidence — the daily briefing's Accept / Reverse / Rework | **Cannot be chosen — must be proven.** Only a session launched by the approved runner (routine `trig_017TZ3JZcLBK6AYH6DKURqMH`, "deepbench-runner"), whose prompt carries the stamp `DEEPBENCH-RUNNER-AUTOMATED-…`, echoed into the session's `runner_cycles` row. No stamp → Manual Design & Build. | **LIVE — approved by John 2026-08-20** (`S-SES-78d` go-live, after two supervised cycles: one correct fail-closed, one full-path ship). Cadence: every 3h **on John's clock hours — 12, 3, 6, 9 AM/PM CST** (John, 2026-08-20; UTC cron `0 2,5,8,11,14,17,20,23 * * *` — the scheduler adds a few minutes' dispatch delay, and the UTC cron needs a one-hour re-align when DST ends in November); pause = disable the routine at claude.ai/code/routines |
| **"Open Workspace"** *(placeholder name — John's to set, Tier 3)* | None — non-DeepBench work (research, documents, anything John runs as Claude Desktop projects today) | John says so at session start | Defined, available |

## Shared invariants — identical in every DeepBench mode

Worktree isolation, branch discipline (`HEAD:dev`, dev→main is John's always), atomic
version/ID counters, full session ceremony (design-before-code, kickoff docs, self-QA with
discriminating assertions, FEATURES row, close-out), verify-never-assert-from-memory. The modes
differ **only** in when John judges — never in what the ceremony requires.

## Manual Design & Build

Today's model, byte-for-byte — everything in `CLAUDE.md`, `CLAUDE-DESIGN.md`, and
`docs/WORKING-WITH-JOHN.md` as written. Untouched by the Automated build. Appropriate whenever
John is present and directing; it is the default absent any explicit selection, forever.

## Automated

The three-engine 24×7 pipeline (Execute / Heal / Invent) governed by §19v: lane routing
(auto vs. gated), the P1–P10 priority order, feature-flag exposure rules, the budget governor,
the trust ladder, and the daily briefing. Appropriate for unattended work only. **Nothing runs
under this mode until a follow-up design session builds the runner against §19v's constraints
and John approves it** — structurally enforced: the stamp that proves the mode cannot exist
before the runner does. John's manual sessions always take deploy-quota precedence over
Automated cycles.

## "Open Workspace" (placeholder name)

Non-DeepBench work done in Claude Code for its tooling (files, Artifacts, memory) — none of the
DeepBench ceremony applies, because worktrees/counters/rows exist to protect the shared repo
and this work never touches it. **One hard boundary: the moment a session in this mode would
read or write `deepbench-frontend` or its Supabase, it stops and restarts under a DeepBench
mode.**
