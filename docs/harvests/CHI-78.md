# `CHI-78` — the blocker is wrong, and the row is two defects

**Amended 2026-07-30, session `design-agt-47`.** Static review of the row against shipped state — no
live run. Backlog row: `docs/FEATURES.md`. Beta-gate, bucket 1 (`docs/BETA.md` row 2).

## What the row says to do

> *"Revisit after `CHI-77` ships, with a real captured reason in hand."*
> Status: `S-future (revisit after CHI-77 ships — needs a real captured reason first)`

Both halves of that are wrong, in increasing order of importance.

## 1. `CHI-77` shipped — the wait is over and nobody noticed

`CHI-77` shipped **v6.3.152, `c7f2dc1`, 2026-07-27, "✅ Done, QA passed"** (`docs/SESSIONS.md`,
`S-CHI-77-design/S-CHI-77`). The row's gating condition has been satisfied for days and nothing
reopened the item. On its own this is just staleness.

## 2. The instrument cannot observe the dominant failure class

This is the real finding.

`CHI-77`'s fix was `describeCaughtError()` inside `onSend`'s **catch** — it surfaces the
`status`/`detail` an already-thrown error was carrying and previously discarded. It reports on
exceptions. It is structurally incapable of reporting when nothing throws.

Now read the row's own occurrence data (2026-07-28, `ui-updates-0727` QA, 3 of 5 runs):

| # | Symptom | Threw? |
|---|---|---|
| 1 | silent stall at theory-generation hop — feed stuck at 3 hops, **no error bubble, console clean** | no |
| 2 | silent stall, same hop, same signature | no |
| 3 | hop 24 on Owen Marsh — The Proofreader's gate | yes |

**Two of three did not throw.** A pipeline that stops advancing with a clean console is an awaited
promise that never settles — a liveness failure. An exception that loses its reason is a different
defect with a different fix. Waiting for `CHI-77` to hand over "a real captured reason" for the stall
class will wait forever, because there is no exception for it to catch.

What would actually observe it is a **per-hop deadline or watchdog** that fires on *absence* of
progress rather than on a throw. That is a different piece of work from `CHI-77` and it does not
exist yet.

## 3. The row bundles at least two defects

- **Class A — theory-generation silent stall** (×2). Liveness. Needs the watchdog above.
- **Class B — hop-24 throw on Owen Marsh — The Proofreader's gate** (×1). The row itself already
  ties this to `LOO-21`'s double-verification latency exposure.

Fixing either leaves the row failing, and a bucket-1 row that cannot go green on one fix will read as
an unexplained regression when the `SES-29` run is scored. **Split before scoping.**

## Caveat this session could not close

The 2026-07-28 evidence may not have exercised `CHI-77` at all. `docs/BETA.md` records the
GitHub→Vercel `dev` auto-deploy stalling on 2026-07-28 ~21:55, leaving `origin/dev` **14 commits**
past its last build (root cause: the Vercel free-tier 100-deploys/day cap; 120 deploys that UTC day).
If those QA runs hit a preview predating v6.3.152, then "console clean" means only that the old
un-instrumented catch stayed quiet — not that nothing threw.

**Before acting on the split, confirm which build the 2026-07-28 runs used.** If they predate
v6.3.152, the stall-vs-throw classification above is unproven and one instrumented reproduction is
the cheapest way to settle it — `node scripts/check-deploy-current.js --worktree=<path>` first, per
`SES-015`.

That caveat does not rescue the row's blocker, though: `CHI-77` is shipped either way, and a
catch-based reporter cannot observe a non-throwing stall either way.
