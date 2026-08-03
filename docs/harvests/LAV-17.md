# LAV-17 — Run Assembly feed enrichment: measured degradations & discovery decisions

> Harvest file for the `LAV-17` (Feature) row in `docs/FEATURES.md` — full detail lives here,
> the row keeps the summary. Created 2026-08-02 by discovery `design-list-arch-0802` when the
> row crossed the 2000-char cap (CLAUDE-DESIGN.md step 9 / check 3d). Append, never rewrite
> history.

## Verified degradations (S-LAV-15 QA pass, 2026-08-02)

Confirmed live against a real `training-turnover-benchmark` run, not inferred:

- **(a)** The quality gate has no per-criterion scores anywhere in the repo (`gate.eval`
  carries only `result` + `critique`), so Owen Marsh — The Proofreader's entry reads
  "Scored the draft — verdict pass." where the approved mock promised "Scored the draft 5/5
  on all criteria". **Discovery `design-list-arch-0802` sealed this as non-derivable**
  (`ARCHITECTURE.md` §19q): any "scored X/5" display requires a quality-gate capability
  change first — a separate decision, not event enrichment. Do not re-promise it.
- **(b)** `qa_answer` has no headline, so Marcus Webb — GEO CSO Expert's entry reads
  "Drafted the answer with 7 citations" where the mock promised "Drafted the 26-vs-46-month
  cycle spread".
- **(c)** Citations are countable but their source isn't, so "4 **Library** citations" isn't
  derivable.

## Caution: the coding report's 8-item degradation list is partly wrong

The S-LAV-15 coding session's completion report listed 8 degradations; **3 were disproven
live in that same QA pass** (delegation `reasoning` lost, PM-brokered hand-off carrying no
`task`, `assembly_work` inert until AA-179c) — reasoning, task descriptions and retrieval
entries all render today. **Re-measure before scoping; only (a)–(c) above are verified.**

## Direction settled (discovery `design-list-arch-0802`, John's call, 2026-08-02)

Enrich at the executor's event seam — the streamed frame carries the substantive content the
executor already holds at emit time (delegate's returned summary/reasoning on
`delegation_complete`, `gate.eval` carried whole, the delegation task contract where known).
DB-read-at-render (drawer reading `durable_hops`/`ai_activity_log`) explicitly ruled out:
second story vs. the canvas mid-run, entries land only after the durable write, first
render-time DB dependency on the console. Governing invariants: `ARCHITECTURE.md` §19q.
Root-cause narrative of how the gap shipped (the kickoff silently swapped the approved mock's
data source): `docs/SESSIONS.md` entry `design-list-arch-0802`.

**Scope note from the same discovery:** John approved the outcome that plumbing frames
(hand-off/hand-back/routing announcements) fold under the receipt they belong to — the mock's
5-receipt shape vs. today's 18 frames. The fold is client-side display logic; its mechanics
are this ticket's kickoff design question (split desktop/client vs `api/` halves there).
Client-side companion ticket: `LAV-19` (UI) — drawer rename to `Run Assembly · <N> events`
plus the critique-on-pass display line.
