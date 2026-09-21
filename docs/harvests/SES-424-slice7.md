<!-- DeepBench v7.0.539 | docs/harvests/SES-424-slice7.md | SES-424 slice 7 — premise revalidation, measurements, alternatives -->
# SES-424 slice 7 — harvest (reasoning; the kickoff carries every fact a task needs)

## Premise revalidation (2026-09-20, cycle d75cc389)

Both halves named in the ticket's own text were re-measured before anything was designed.

**Half 1 — the written authority matrix: ALIVE AS A CRITERION, DEAD AS A DESIGN TARGET.**
`public.governance_rules` row `MANAGER-AUTHORITY-MATRIX` reads live: `status live`, `enforcement
reviewer`, `source_group claude-md-hard-rules`, `canonical_doc
docs/WORKING-WITH-JOHN.md#decision-authority-matrix`, 7 statement rows, 3,666 B, `created_at
2026-09-20 09:43:02Z` (slice 2, `v7.0.534`). It is rendered into `docs/WORKING-WITH-JOHN.md:76-84`
under `## Decision Authority Matrix` behind the `{{rule:MANAGER-AUTHORITY-MATRIX}}` marker, carried
in `docs/governance/RULES-SNAPSHOT.md:29`, and guarded by
`tests/regression/ses-424b-authority-matrix.test.mjs`. Its seven rows cover the cycle-card re-pin,
the pick, build findings + gate cards, agent rows, the ship verdict + governance rules, and John's
own list (money, dev→main, hiring/`agents.is_active`, ratifying the 20-assignment bar), each citing
where that authority is *already* live. Designing it again would be designing a dead premise, and
`pattern:95` says the way a ticket's own criterion gets discharged is by being satisfied, not by
being restated. Its ONE deliberately unsettled row — who may call `reverse_decision()` inside a
decision's window — is recorded in the statement itself as left with John and sits on his desk as an
undecided `gated_before_build` card. That is John's, not designable here.

**Half 2 — the exclusion pass: ALIVE, and the gap is precise.** `pg_get_functiondef` read this
cycle for both pick homes:

- `drain_epic_next(uuid)` line 77: `c_unblocking constant text[] := ARRAY['done', 'removed',
  'delivered'];`, used at lines 236, 279 and 297 (pick predicate + two census expressions), under a
  comment that says in as many words: "by both the pick predicate and the `blocked_detail` census --
  two hand-copied literals drift."
- `prime_directive_queue()`'s `buildable` CTE carries the third hand-copy: `AND (b.blocked_by IS
  NULL OR EXISTS (SELECT 1 FROM public.backlog_items bb WHERE bb.id = b.blocked_by AND bb.status IN
  ('done','removed')))`. **It has drifted: no `delivered`.** The comment predicted its own defect.

The written rule is the drain's, not the queue's: `docs/runbooks/runner-cycle.md:2477` — "`delivered`
UNBLOCKS a dependent, though a delivered ticket is not itself pickable", quoting John ("After (1)
ships, `SES-191`'s remainder becomes buildable") — and `:2486`, "the member is re-admitted the
instant the blocker reaches `done`/`removed`/`delivered`". So this is not a new judgment about who
decides anything; it is the queue being brought back to the rule already written down and already
John's. Nothing here weakens `SES-218`'s directive (`07dea95e`).

Live exposure: 20 rows carry `status = 'delivered'`; 0 of them is anybody's `blocked_by` today, so
the divergence is **latent** — exactly slice 1's situation, and the reason the proof is a
rolled-back fixture rather than a live assertion.

**The "formally blocked pair".** 47 `blocked_by` edges exist. Grouped by the blocker's live status,
5 point at a blocker in `removal proposed` — a state that appears in no unblocking set and that no
build will move: `SES-397` (`0f0c3d0d`), `SES-402` (`e5ba8333`), `SES-408` (`9f37d333`) → `SES-378`;
`SES-416` (`7f3a77c4`) → `SES-415`; `SES-417` (`497a7a0b`) → `SES-416`. Every blocker is one of the
nine rows `SES-424` consolidated, so each edge asserts a wait that cannot end: the blocker will not
reach `done` (its work moved to `SES-424`), and reaching `removed` is a separate act nobody has
scheduled. 10 further edges hold an open/partial queued ticket behind an ordinary open blocker —
those are real waits and are left alone.

`SES-416`'s own text — "The Designer, the Builder and the Development Manager are assembled with the
decision patterns tagged for their role, and every answer names the patterns it applied; each
citation is recorded" — is what `SES-424` slices 4-6 shipped (`v7.0.536` role-pattern knowledge,
`v7.0.537` `decision_pattern_citations`, `v7.0.538` the executor's own citation path). The edge is
therefore a false fact in the data, not a live dependency.

## The decision, and the one I did not take

Two ways to unblock the pair were weighed.

- **Widen the unblocking set to include `removal proposed`.** Rejected. It is a *rule* change to a
  predicate John directed (`07dea95e`), it is written down in the runbook as three states, and
  `removal proposed` is a pending proposal, not a terminal state — a rejected proposal returns the
  row to `open` and the dependent should be held again. Changing the rule to clear five stale rows
  is the tail wagging the dog (`pattern:166`: a John rule is never weakened without his words).
- **Clear the five edges as a finding.** Taken. The edge asserts something untrue; correcting it is
  a `re-scope`, which the authority matrix's own row 3 puts with the manager ("what a build finds —
  file, defer, re-scope, remove, reopen"), under a recorded decision with a full-row before-image,
  reversible by `reverse_decision()` (`backlog_items` is in its allowlist). The pass is written
  set-based (`WHERE the blocker is 'removal proposed'`) with a RAISE unless exactly 5 rows move and
  they are exactly those five — never a hand-listed UPDATE.

Centralisation shape: I did **not** introduce `backlog_blocker_cleared(uuid)` wrapping the whole
`EXISTS`, because the drain's census uses the array three more times in `<> ALL (...)` form and
rewriting those is risk the ticket does not need. One IMMUTABLE `backlog_unblocking_statuses()`
returning the array is the whole seam: the drain's DECLARE initialiser calls it, the queue's clause
calls it, and there is no fourth copy to drift (`pattern:14`/`pattern:15`).

## Not taken, and why

- **A `runner-cycle.md` sentence recording the single predicate.** `wc -c` = **380,718** against
  `SES-336`'s 381,000 ceiling (pinned by `ses-413d-questions-scoreboard.test.mjs:76`): 282 B of
  headroom, less than one stamp line, and a runbook edit also drags the `dm-knowledge-cycle-card`
  re-pin chain (matrix row 1) behind it. Named in the STOP LINE; it needs bytes freed first, the
  same constraint slices 2 and 3 both recorded.
- **The 48 standing `removal proposed` rows.** A board-wide removal verdict is its own work.
- **`ses-84-claims-classed` / `ses-332-first-run` / `ses-415-role-tagged-criteria`.** `SES-426`'s
  standing red; one of them fails on `SES-424`'s own `supports_class`, which the Prioritizer's
  `classify-ticket` pass owns this cycle. No hand-written `supports_class`.

## Fixture and concurrency notes

`SES-382`: parallel cycles share this database, so the fixture ids carry a random 5-digit suffix and
every insert is deleted in `finally`. The dependent sits at `queue 999990` and `filed_at
2026-08-01`, which keeps it clear of the post-2026-08-21 `scope_rationale` fence in `buildable`. The
blocker is created `queue NULL` so it is never itself a pick. `.claude/rules/supabase-function-signature.md`
applies to both `CREATE OR REPLACE`s: identity argument lists are unchanged, and the migration's
`DO` block asserts `pg_proc` count = 1 for all three names before it commits.

---

## Build record (2026-09-21, cycle `d75cc389`, `v7.0.539`)

Appended by the Builder. The design half above is unchanged; this section is what the build
actually measured, so a cold session reads the outcome next to the reasoning.

**Down, captured before anything was applied.** `capture_migration_down(d75cc389…,
'ses424_blocker_cleared', [prime_directive_queue(), drain_epic_next(uuid)])` →
`runner_migration_downs` **`e7b8c829-71d4-4ba2-a0b0-459cc9c68aae`**, classification
`auto-downable`, 2 objects captured, 0 refusals, 36,642 B of derived down SQL.

**Migration 1 `ses424_blocker_cleared`.** `public.backlog_unblocking_statuses()` created
(`sql`, `IMMUTABLE`, `REVOKE ALL … FROM PUBLIC` + `GRANT EXECUTE … TO service_role`, mirroring
`prime_directive_queue`'s own ACL). **Neither caller's body was retyped.** Both were re-executed
from `pg_get_functiondef` with exactly one `replace()` each, guarded by an occurrence count that
refuses anything other than 1 — so "every other byte as read" is enforced by the migration rather
than promised by the author. Measured after: `prime_directive_queue()` 152 → 150 lines (the
three-line clause became one), `drain_epic_next(uuid)` 441 lines unchanged, line 77 now
`c_unblocking constant text[] := public.backlog_unblocking_statuses();`. `pg_proc` = 1/1/1.
The self-QA fixture ran the triple listed → listed → absent and left 0 residue.

**Migration 2 `ses424_blocked_by_pass`.** Decision **`99e15850-ea15-412f-8f2b-c31e35930079`**
(`re-scope`, `SES-424`, `ladder_work_class` `tooling`, window to 2026-09-24T00:10:39Z). Five
full-row before-images written **first**, one per ticket:
`4747238c…` SES-397, `bad6a049…` SES-402, `6b175b5b…` SES-408, `0354774d…` SES-416,
`d8077637…` SES-417. Edges on a `removal proposed` blocker: **5 → 0**. Verified afterwards that
`(image.row_data - 'blocked_by') = (to_jsonb(live) - 'blocked_by')` for all five — no other column
moved — and that `updated_at` is untouched on every one, which is what keeps the undo open:
`reverse_decision()` refuses a row whose `updated_at` is later than `decided_at`.

### The one real finding: `removal proposed` is not the same set as "outside the unblocking set"

The new test's board-wide census was first written as *no ticket may wait on a blocker whose status
the definition does not hold*. It failed, and the failure was the test's, not the platform's: it
named ten healthy waits — `AGT-71/72/74/75/76/78/83/84`, `AGT-56`, `SES-317` — each behind an
**`open`** blocker. A wait on an `open` blocker is the mechanism working: the blocker is live work
and finishing it ends the wait. `removal proposed` is the shape that cannot end, because the
blocker is one of the nine rows `SES-424` consolidated and no later event moves it either way.
The kickoff's clause B said `removal proposed` precisely; the generalization was the build's, and
the census now counts that one status. Worth keeping because the two readings look identical in
prose and differ by ten rows on the live board.

### Two fixture departures from §4, both forced by a constraint §4 did not name

- **`row_ordinal`.** §4 gives both rows `row_ordinal 0` under `source_file 'ses-424g'`, but
  `backlog_items_source_file_row_ordinal_key` is `UNIQUE (source_file, row_ordinal)` — the second
  insert of a single run would collide with the first. The blocker takes the run's 5-digit nonce
  and the dependent takes `nonce + 100000`, which also keeps two concurrent suite runs apart
  (`SES-382`, and `ses-424a`'s own header records the same lesson).
- **The test blocker carries `epic_id NULL`** (the migration's fixture kept §4's epic). This is
  what lets clause C walk the blocker through *every* status the RPC names:
  `backlog_done_requires_verdict` refuses `status = 'done'` on a ticket whose epic belongs to a
  project, so a blocker on the executing epic could only ever have been checked for two of the
  three. A blocker is read only through `bb.status`, so it needs no epic; the dependent keeps it,
  because it is the row that has to be buildable.

### What the test asserts that the migration could not

The migration's `DO` block proves the new bodies; it cannot prove them *through PostgREST*, which
is the seam every real caller uses. `ses-424g-blocker-cleared.test.mjs` re-runs the triple over
`rpc/prime_directive_queue`, adds the reverse edit (blocker back to `delivered` → the ticket
returns, so the exclusion in A iii was the status and nothing else), and drives clause C's sweep
from `rpc/backlog_unblocking_statuses`'s own output rather than from a literal — a second
hand-copy of the three words, in the test file, is the defect this ticket removes.
`drain_epic_next(uuid)` is never called (`ses-281`); its half is the migration's `pg_get_functiondef`
assertions, declared here rather than silently omitted.
