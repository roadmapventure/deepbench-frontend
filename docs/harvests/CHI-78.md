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

---

# CHI-78 — row detail harvested 2026-08-01 (SES-68)

Full `docs/FEATURES.md` row text as it stood immediately before this session's harvest-trim (verbatim):

| CHI-78 | Task Success Rate | **New, design session `chi-ux-0727` 2026-07-27 — the intermittent failure behind John's screenshot, made diagnosable (not fixed) by `CHI-77`.** A full Q&A pipeline runs (Marcus answer → Owen gate → display) then throws *after* Marcus, losing the whole turn. Verified live: backend returns HTTP 200 on all calls, so the throw is a streamed `error` event, a stream ending without a `result`, or a client post-process error — never a non-2xx. Could not reproduce in 4 live runs on the identical path; leading hypothesis is a timeout under load — firing a question while the on-load news pipeline was still running nearly **doubled** end-to-end latency (63s → 108s, measured live), matching `chi-status-gap-0727`'s concurrency finding. Revisit *after* `CHI-77` ships, with a real captured reason in hand. Occurrence data 2026-07-28 (`ui-updates-0727` QA, 3 of 5 runs affected): two silent stalls at the theory-generation hop (feed stuck at 3 hops, no error bubble, console clean) and one at hop 24 on Owen's gate (matches `LOO-21`'s double-verification exposure); Clear+resubmit recovered both times. Distinct from `AA-194` (block-escalation mis-routing) and `SCA-2`/`HAR-9` (specific timeout/truncation causes); related to `LOO-21` (latency doubling). **AMENDED 2026-07-30 (`design-agt-47`) — both halves of this row's blocker are wrong.** (1) `CHI-77` **shipped** v6.3.152 (`c7f2dc1`, 2026-07-27, QA passed, `docs/SESSIONS.md`) — "revisit after `CHI-77` ships" has been satisfied for days and nothing reopened this row. (2) The load-bearing error: `CHI-77`'s fix is `describeCaughtError()` inside `onSend`'s **catch**, so it can only report a reason when something is *caught* — but 2 of the 3 occurrences above are **silent stalls, clean console, no error bubble**, i.e. nothing threw. Waiting on "a real captured reason" can never resolve that sub-class; a promise that never settles is a different defect from an exception that loses its reason. **This row also bundles ≥2 defect classes** (theory-generation silent stall ×2; hop-24 throw on Owen Marsh — The Proofreader's gate ×1, already tied to `LOO-21`) — fixing either leaves the row failing, so it needs splitting before it is scoped. **Unverified caveat, stated rather than assumed:** the 2026-07-28 runs may not have exercised `CHI-77` at all — `docs/BETA.md` records the dev auto-deploy stalled 2026-07-28 with `origin/dev` 14 commits past its last build, so "console clean" is not yet proof of a non-throwing stall. **FEATURE DETAIL:** `docs/harvests/CHI-78.md`. | ❌ Missing | S-future (split first, then instrument the stall class — `CHI-77` cannot observe it) |
