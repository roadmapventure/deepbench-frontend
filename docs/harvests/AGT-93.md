# AGT-93 — harvest

## Premise revalidation (first act)

**Alive.** The decisive measurement is the CHECK constraint, not the prose:

```
ck_backlog_scope_origin CHECK (scope_origin IS NULL OR scope_origin = ANY (ARRAY[
  'original','gate-review','john-named','discovered','pre-existing','enhancement']))
```

Six values live. `governance_rules.FILE-MATRIX.statement` (1498 chars) enumerates five.
`docs/runbooks/session-setup.md:284` enumerates the same five. The platform therefore accepts a
filing value that no document tells an author exists — and `M6-04`/`ses283_enhancement_lane`
enforce admission rules on it in `drain_epic_next()` and `prime_directive_queue()`.

Both `public.audit_findings` rows filed to AGT-93 (`a0b515a3-0b54-4dc0-a7e8-5733ef0278a8`,
`074ece70-0ae4-4888-a10b-aebf35f423cc`, both `status='ticketed'`) reproduce those passages verbatim.

## Line-number drift (the third ticket running to show it)

| Ticket says | Live | Content |
|---|---|---|
| `session-setup.md:269` | **:284** | the `scope_origin` template comment |
| `session-setup.md:310` | **:314-315** | `a missing one is flagged, not refused.` |

The file is 868 lines. Drift of +15 and +4. AGT-89's runbook citation was ~99 lines stale and
AGT-91's was 2; all three tickets came from the same audit, which records positions that rot.

## Where each rule's canonical home actually is

| Rule | `canonical_doc` | Byte-identity test? |
|---|---|---|
| `FILE-MATRIX` | `docs/runbooks/runner-cycle.md#filing` | **No** — and the anchor does not exist |
| `EL-01` | `docs/RUNNER-GOV-ENHANCEMENT-LANE.md#EL-01` | **Yes** — `ses-283-enhancement-lane.test.mjs` |

`grep -c 'id="filing"' docs/runbooks/runner-cycle.md` = **0**. So FILE-MATRIX's statement has two
homes — the row and `RULES-SNAPSHOT.md` — and the fenced runner-cycle.md is not one of them. That is
a **latent AGT-91-class defect**: a live row naming a home that is not there. AGT-91's own test
grades *retired referents*, not *unresolvable anchors*, so it does not catch this.
**Recommended separate ticket: assert every live `governance_rules.canonical_doc` anchor resolves.**

## ORCHESTRATOR AMENDMENT (cycle 8a57f9e3, 2026-09-24 ~06:00Z) — the trap is a PEER, not a stale snapshot

The Designer measured the snapshot drift correctly and its remedy (task 3) is sound in isolation.
It attributed the drift to a snapshot nobody had regenerated. That attribution is **wrong**, and the
orchestrator established why from state the Designer could not see:

- `public.governance_rules` shows `OD-33` and `CAP-SCOPE-FILES` both `updated_at = 2026-09-24
  05:47:56.504224+00` — **after** this turn's own AGT-91 push (05:45Z) and after the full-suite run
  that measured ses-234 / ses-280 / ses-285 all GREEN.
- `public.runner_cycles` shows peer cycle `c7a9d2ef-c564-469f-81db-4663dc613b41` **still open**,
  `last_step = '7 — builder: task 7 controls'`, heartbeat 05:51:52Z. Its ticket is almost certainly
  `AGT-92` — *"Scope-cap baseline and per-rung widening are restated in five registry rows that
  disagree on the canonical home"* — which is precisely OD-33 and CAP-SCOPE-FILES.

So the two doc lines task 3 would edit are **the peer's in-flight work**, and the peer will push its
own version of them. Two cycles editing the same two lines is the duplicate-build failure register
B42 coordinates against, and adjudicating a live peer's half-finished ship is what B37 forbids.

**Therefore this cycle WAITS for the peer to land rather than racing it.** On the peer's push the
cycle rebases and re-measures: if the peer re-aligned the census and STANDARDS homes, task 3 is
already satisfied and the Builder verifies rather than edits; the snapshot regeneration in task 4
then lands on a tree whose docs already agree. If the peer lands without those homes, task 3 stands
as written. Either way the decision is made on a fresh measurement after the rebase, never on this
paragraph.

## The lane is shut (context, deliberately not fixed here)

- `runner_settings.invention_requires_epic` = **true** -> `public.file_invention_proposal()` raises.
- `select count(*) from backlog_items where scope_origin='enhancement'` -> **1**, filed 2026-08-23.

`SES-369` and `SES-430` own that gate. AGT-93 makes the filing rule findable and correct; it does not
open the lane, and the prose says so.

## Alternatives considered and rejected

1. **Also amend EL-01.** Rejected: byte-pinned by `ses-283`, and the ticket does not ask for it.
2. **Also fix `M5-14`.** Rejected: a scoping rule, not an enumeration of the permitted set.
3. **A CHECK-to-doc generator** so the enumeration can never drift again. Rejected as scope; the new
   test's live arm gets the same protection by *grading* the doc against `pg_constraint`.
4. **Let the regeneration ride and file the reds.** Rejected — see the trap above.

## Cap accounting

Kickoff **8172** bytes against `KICKOFF_BYTE_CAP` 8192, confirmed with
`node scripts/verifier.js --check-kickoff=<path>` -> exit 0, `kickoff-within-cap`.
Five files against a cap of 20; five tasks against 21.
