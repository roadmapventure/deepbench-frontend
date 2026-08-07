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
plus the critique-on-pass display line. **Shipped 2026-08-02 (`v7.0.53`, archived) — including
the candidates slice: `candidates_considered` now rides the `request_help` `delegation_complete`
event.**

## Constructor asymmetry — read before adding ANY further event field (S-LAV-19, 2026-08-02)

Two client constructors hand-rebuild the delegation event payload from a **named field list**
(`SES-57` mirror-payload class): `src/hooks/useHarnessStream.js` (Agent Console — carries
`candidates_considered` as of `v7.0.53`) and `src/screens/MarketIntelligenceScreen.jsx`'s
`onDelegationProgress` (~L3764, CHI — deliberately does NOT; no Run Assembly surface there).
They are now asymmetric. Any kickoff executing this ticket's enrichment must list **both**
constructors in scope per new field, or the field silently dies before render on one screen
while fixture tests pass — exactly how `LAV-15`'s Task 3b would have failed without the
coding session's catch.

## Constructor asymmetry — widened by S-LAV-21a (v7.0.54, 2026-08-04)

`useHarnessStream.js` (Agent Console) now additionally carries — and CHI's
`MarketIntelligenceScreen.jsx` `onDelegationProgress` (~L3764) deliberately does NOT:
`toCapabilitySlug` + `toIntentSlug` on delegation **starts**, `toIntentSlug` on delegation
**completions**, `toIntentSlug` on `prompt_assembled`, and `parent_span_id` + `toCapabilitySlug`
on `assembly_work*` frames (the last pair doubly moot on CHI — its constructor drops assembly
frames before the events array). Per this file's standing rule: any kickoff enriching further
fields must decide **both** constructors per field.

## Constructor asymmetry — widened again by S-LAV-25 (v7.0.59, 2026-08-06)

`useHarnessStream.js` now additionally carries — and CHI's `onDelegationProgress` deliberately does
NOT (still no Assembly surface there, same LAV-19/LAV-21a precedent): `account` on delegation
starts, completions, `delegation_return` and `assembly_work*` frames, plus `task` on delegation
**starts** (the completion build has carried `task` since `LOO-012`). Both are §19s narration
carriers and forward-carry only — no frame emits either field yet; `LAV-17`/`LAV-22` are the emit
seam. Standing rule unchanged: any kickoff enriching further fields decides **both** constructors
per field.

## Related gap found live by S-LAV-21b QA — now `LAV-22` (Observability, Beta-gate bucket 5)

A capability completion that resolves via internal delegation (`LOO-010` path) streams NO typed
hop at all — on the guardrail-demo run, the gate ran, delegated, finished, and no `proofreader`
frame ever existed for any consumer (Agent Routing drawer included). §19q's invariant family:
the seam fix is the executor emitting the resolving capability's own typed completion. Sequence
with this ticket — same emit sites.
