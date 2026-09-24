# AGT-88 harvest -- measurements, alternatives, and the slicing argument

*Reasoning only. Every fact a task depends on is in the kickoff; this is the record behind it.*

## Premise: ALIVE, measured

`pg_get_functiondef` on the six named functions, read live 2026-09-24 (never recalled):

| function | bytes | volatility | literals it carries |
|---|---|---|---|
| `scheduler_gate(uuid,text,timestamptz)` | 3,867 | volatile, read-only body | 4 shadow `coalesce`s |
| `drain_chain_gate(uuid)` | 7,250 | volatile, writes | `c_flagged` (:24); also `COALESCE(chain_max_noship_streak,2)` |
| `prime_directive_queue()` | 7,892 | sql STABLE | 3 dates, 1 array, 1 interval |
| `recompute_backlog_queue()` | 3,859 | volatile, SECURITY DEFINER, writes queue numbers | 1 date (:57) |
| `drain_epic_next(uuid)` | 27,356 | volatile, writes before-images | 6 `c_flagged` uses, 3 date sites, 2 intervals |
| `runner_should_boot()` | 7,776 | sql STABLE | none -- untouched by this ticket |

## The three ticket counts, checked

A body-wide scan (`pg_get_functiondef ... like`) over every `public` function:

- `needs-desktop` hits **five** functions. Three are the pick-blocking list (ticket right). `record_skip`
  maps `reason_kind = 'needs-desktop'` to `unblock_kind = 'prep'`; `runner_items_accept_clears_flag`
  clears `design_status IN ('needs-john','needs-desktop')` on an Accept. Neither is the pick list, and
  re-pointing either at `pick_blocking_flags()` would silently change an unrelated behaviour.
- `24 hours` hits **four**. Three are claim staleness -- `prime_directive_queue`, `drain_epic_next`
  (twice) and **`backlog_mode()`**, which the ticket missed. `stall_watchdog`'s is register B37's
  cycle-silence bar, derived from the longest observed resurrection gap; it is a different fact and
  must keep its own literal until it gets its own home.
- `2026-08-21` hits **three** functions (ticket right) but **six** sites, because `drain_epic_next`
  spells the date inline at `:218` and `:351` although `c_lane_cut` is declared at `:97` -- a
  second-copy defect inside a single body.
- `scheduler_gate` carries **four** shadows, not three: the ticket forgot `coalesce(s.scheduler_on, true)`.
  All four columns are NOT NULL with exactly those defaults, so all four are unreachable today.

## Grants (the column-grants rule, checked rather than assumed)

`information_schema.role_table_grants` for `public.runner_settings`: `postgres` and `service_role`
only. No `anon`, no `authenticated`. So `.claude/rules/supabase-column-grants.md` does not apply to
the two new columns -- there is no public grant for them to be missing from, and no reader to break.
The five functions are likewise `postgres=X | service_role=X`, so nothing browser-side calls them.

The inverse hazard is real and handled: a NEW function is born with `PUBLIC` EXECUTE. Without the
`revoke ... from public`, `pick_blocking_flags()` would be the only object in this set the anon key
could call. It returns a constant, so the exposure is trivial, but the asymmetry with its siblings is
not, and the fix is one line in the same migration (same discipline as SES-384's default-ACL note).

## Signatures

No parameter list changes anywhere in this slice, so `.claude/rules/supabase-function-signature.md`'s
overload trap cannot fire. That is an argument, not a proof, which is why task 6 asserts
`count(*) = 1` per name regardless: the rule's own lesson is that an overload break is invisible from
the new call and total from the old one.

## Why this is sliced, and why the cut falls where it does

Five consumers carry the literals. Four of them can be proven by a repeatable call: `scheduler_gate`
and `prime_directive_queue` are read-only for practical purposes, `recompute_backlog_queue` is
idempotent (recomputing a settled board yields identical queue numbers, so a before/after diff is a
real proof), and `drain_chain_gate`'s fifteen output columns can be compared directly.

`drain_epic_next` cannot. It is VOLATILE and writes before-images and retirements on every call, so
"call it, apply, call it again, compare" is not available -- the second call is not the same
experiment as the first, and running it twice mid-chain mutates the runner's own record. It is also
27,356 bytes with 10 of the 16 sites, i.e. the largest full-body re-emission and the one whose typo
stops the runner picking at all. Shipping it blind, unattended, into a live chain is the risk this
design refuses. `AGT-88b` takes it, together with `backlog_mode()`'s interval and
`drain_chain_gate`'s unregistered `COALESCE(chain_max_noship_streak, 2)`.

Consequence, stated honestly rather than hidden: after slice 1, `OD-07` and `OD-08` still have one
function each carrying a copy. The amended registry statements say so by name. That is a partial
ticket described accurately, not a ticket claimed closed.

## Alternatives considered

1. **Ship all five in one migration.** Rejected: ~50 KB of function bodies re-emitted in one range,
   against a rollback engine that cards rather than reverts, while a chain is mid-drain.
2. **Additive-only slice (columns + `pick_blocking_flags()`, no consumers).** Rejected the other way:
   provably safe but unobservable, and a QA that can only assert the columns exist is the
   "would it fail if the change did nothing" test failing.
3. **A `settings` CTE cross-joined into `prime_directive_queue`.** Rejected in favour of scalar
   subselects: the CTE restructures the query shape, the subselects are five in-place token swaps and
   the function already uses that exact pattern twice for `enhancement_cap_pct`.
4. **A regression test that mutates `runner_settings` and restores it.** Rejected: cycles run in
   parallel (SES-382) and a shared-fixture write collides. The mutating controls are one-time,
   transaction-wrapped, hand-run QA; the standing test asserts structure only.
5. **`scheduler_gate` returning a new `settings-missing` verdict instead of raising.** Rejected: a new
   verdict string is a contract change for `run-project.js` and the tests, whereas
   `drain_epic_next` and `drain_chain_gate` already `RAISE` on impossible preconditions. Raising
   matches the neighbourhood and is the stronger fail-closed.

## What the QA would catch that a weaker one would not

The `interval_hours = 2` control is the sharp one. Live `interval_hours` is 1, and the shadow literal
is 3, so on the unchanged tree setting the column to 2 changes nothing observable -- the gate answers
`run` either way. After the change it must answer `paced`. A QA that only re-ran the current call and
saw `run` would pass on a build that did nothing at all; running the control before AND after is what
turns it into evidence.
