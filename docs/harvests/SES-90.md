<!-- DeepBench | harvest record | SES-90 | v7.0.111 -->
# SES-90 — mine the local session archive into `JOHN-DECISION-PATTERNS.md`

`docs/FEATURES.md`'s row is the pointer; this file holds the full scope, the constraints, and the
carry-over finding from `SES-79`.

## Origin — John's Rework line

John tapped **Rework** on the `SES-79` briefing card at 2026-08-20 23:54Z. His reason, verbatim:

> Pass. Also Create another ticket to mine local files

*"Pass."* — the `SES-79` ship (`bf070e8`, `v7.0.110`, 5 → 100 criteria) is fine; nothing reverted.
*"Create another ticket to mine local files"* — file the unmined half as its own ticket. Harvested
by runner cycle `cycle-20260820-2357` into `runner_directives.58e13c5d-fccb-4bcd-84e5-4c778f81b63f`,
`item_ref` → the reworked card `runner_items.0edac766-10e1-44c8-956e-b59c2bccd02b`. A Rework is
ladder-neutral: tooling stayed rung 3 / streak 3.

## What is unmined, and why

`docs/RUNNER-GOV-0820-REQUIREMENTS.md` line 106 scopes automation-queue step (4) as *"`SES-79`
expanded over the full local session archive + structured taps."* `SES-79` mined the two **in-repo**
corpora only — `docs/SESSIONS.md` (8,242 lines) and `docs/FEATURES-ARCHIVE.md` (1,490 lines) — and
said so out loud rather than burying it: `docs/SESSIONS.md` line 22, the `SES-79` row's "**Open:**"
clause, and the briefing card's "Out of scope, said out loud" paragraph all record the gap.

`ARCHITECTURE.md` §19v makes `docs/JOHN-DECISION-PATTERNS.md` the criteria source for **every**
autonomous choice, and fails anything it does not cover closed to the gated lane. Each criterion
added widens what Automated mode can decide well instead of escalating to John — which is the whole
value case for finishing the pass.

## ⚠ This ticket cannot run in the cloud

`~/.claude/projects` is on John's machine. It is not in this repository, not in Supabase, and not
reachable over the network from a runner container. No amount of cycle budget changes that.

`SES-90` is therefore written to be executed by **a session on John's laptop**, and says so in the
row, in `session_ref`, and here. A future cloud cycle that picks it up will find nothing to read;
the ticket's job is to prevent that wasted cycle, not merely to survive it.

## Scope

- **Output file:** `docs/JOHN-DECISION-PATTERNS.md` — the same file `SES-79` wrote.
- **Format, inherited verbatim:** one imperative line, then a concrete, checkable `Seen in:`
  instance. Appended into the existing seven themed sections — never a parallel structure.
- **Dedupe against the current 100 criteria** before adding anything.
- **Source:** the local Claude Code transcript archive, `~/.claude/projects` (searchable), plus any
  structured taps John has accumulated.

## Privacy — a constraint `SES-79` did not have

The in-repo corpora were already in git. The local archive never was: it is John's full transcript
history and may contain secrets, credentials, customer data, or personal material that has never
been in a repository. `SES-90` extracts **criteria**, and its `Seen in:` citations must be short
decision quotes plus a session reference — never bulk transcript text pasted into a committed file.

## Carry-over finding — `SES-79`'s QA checker was never committed

Verified 2026-08-20 by cycle `cycle-20260820-2357`, not recalled:

- `git log --name-only bf070e8` lists exactly five files — `CLAUDE-STATE.md`, `docs/FEATURES.md`,
  `docs/JOHN-DECISION-PATTERNS.md`, `docs/SESSIONS.md`, `docs/backlog/BACKLOG-SNAPSHOT.md` — and
  no script.
- Nothing matching `quote` or `pattern` exists under `scripts/` or `tests/`.

It was a throwaway `test-*.mjs`, which `docs/STANDARDS.md` correctly forbids committing. The
consequence is concrete: the gate that proved **112 of 112** evidence phrases real, and that caught
three near-miss fabrications before they shipped, would have to be rebuilt from the briefing card's
prose. `SES-90` commits it as **`scripts/check-decision-pattern-quotes.js`** so the bar survives as a
real, runnable gate — for this pass and for every later edit of the governing file.

## QA bar for the future pass

Inherited from `SES-79`, now mechanised by the committed checker: extract every quoted evidence
phrase from the shipped file and verify it back against its source; a **red control** (a fabricated
`Seen in:` injected into the real file) must make the check fail, so that a green result means the
evidence is real rather than that the check always says yes.

## Provenance

Filed by Automated runner cycle `cycle-20260820-2357` (`runner_cycles.c1660d2f-9032-4118-b98f-31d8a0cd8749`),
`v7.0.111`, 2026-08-21. Kickoff: `docs/kickoffs/v7.0.111-SES-90-local-session-archive-mining.md`.
Backlog row: `public.backlog_items.b119d535-1428-4acc-84b4-6cf4104e59c2` (before-image
`row_data = NULL` — Reverse is a DELETE of that pk).
