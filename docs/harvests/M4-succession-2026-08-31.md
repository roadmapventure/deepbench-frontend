# Selfbuild M4 succession — the evidence behind SES-254, SES-255 and SES-256

**Filed 2026-08-31 by runner cycle `b0a3dde5-e945-4b38-acf3-acca92c8cf84` (`v7.0.337`).**
Authority: John's Accept on the Selfbuild M3 gate review (`runner_items` card `6c4d3453`,
`decision='accept'` at `2026-08-31T01:27:44Z`, his word verbatim *"Acceept"*), plus standing
directive `0970abad` and Prime Directive `a0ef9525` §6. Drain declared as directive `4583bdc1`.

This file is the long-form evidence. The three tickets carry a short description and point here,
per `CLAUDE-DESIGN.md` step 9 and the 2,000-character description cap (`check 3d`).

**Every figure below was measured by this cycle against the live platform or the tree at
`origin/dev` (`13e0d3f`). Nothing is quoted from the gate-review card without re-checking it** —
the card's own findings were up to three hours old at pick time, and this repo's standing rule is
verify, never assert from memory.

---

## SES-254 — `runner_items.epic_id`'s contract is prose, not a constraint

**Status: VERIFIED, both halves.**

**The mechanism.** `runner-cycle.md` step 8d finds an owed milestone gate review with:

```sql
NOT EXISTS (SELECT 1 FROM public.runner_items ri WHERE ri.epic_id = e.id)
```

That predicate is the whole idempotence of the sweep, and it is correct **only** while
`runner_items.epic_id` is set on gate-review cards and nothing else. One non-review card carrying
`epic_id` makes that epic read as already-reviewed **permanently** — there is no recovery path,
because the sweep can never again see the epic as owing a review.

**Live measurement, 2026-08-31T01:5xZ.** Eight `runner_items` rows carry `epic_id`. Four are
legitimate gate-review cards (`backlog_id` NULL, `display_ref` = `"<Epic> — milestone gate review"`);
**four violate the contract**, all on the M3 epic:

| Card | `kind` | `backlog_id` |
|---|---|---|
| `85aa462a` | `gated_before_build` | `SES-45` |
| `67edeab3` | `gated_before_build` | `SES-210` |
| `0f506259` | `ship` | `SES-211` |
| `5e5c99b6` | `ship` | `SES-182` |

That is exactly what hid M3's own gate review until it was found by hand.

**In-repo verification (subagent sweep, this cycle).** Migration `ses179_runner_items_epic_id` is
`ALTER TABLE public.runner_items ADD COLUMN epic_id uuid REFERENCES public.epics(id)` — nullable,
additive, **no CHECK**. The contract exists only as a migration comment and as runbook prose. No
script in `scripts/` or `api/` enforces it. **No regression test asserts it**: all 129 files under
`tests/regression/` were searched, and every `epic_id` hit is `backlog_items.epic_id` or
`runner_directives.epic_id` — different columns.

**The fix, as the review named it.** Enforce the contract in the database (a CHECK), or narrow step
8d's predicate to `kind = 'gated_before_build' AND backlog_id IS NULL`. That discriminator was
tested against today's live data and separates the four review cards from the four violators with
zero exceptions. The constraint is the better home: `gate-review.md` already warns about the
**inverse** failure (a card filed *without* `epic_id` repeats the review forever), so both
directions want one enforced home rather than two prose ones.

**Boundary for whoever builds it.** Repairing the four existing violating rows is part of this
ticket and needs a before-image each (§19v). A constraint added *before* the repair will reject them.

---

## SES-255 — no bounded way to read a CI conclusion, so the green anchor cannot be recorded

**Status: VERIFIED, and hit again by this cycle.**

**The mechanism.** `runner-cycle.md` step 4a requires the **cycle** — not a script — to read CI's
conclusion for `dev`'s head sha through its own GitHub tooling and hand it to
`scripts/rollback-on-red.js` as `--jobs`. The engine deliberately holds no credential and fetches
nothing; its header says so plainly (*"THE CI CONCLUSION IS PASSED IN, never fetched"*), and
`runner_secrets` carries no GitHub secret of any kind.

**This cycle's own measurement.** `list_workflow_runs` for `ci.yml` on `dev` with `per_page=1`
returned **71,371 characters**, exceeded the tool-result cap, and its overflow was written to the
permission-gated `~/.claude/.../tool-results/` path that step 9 and register B39 both forbid an
unattended cycle to shell-process. That is **exit 2 — could not run, not a pass**. No green anchor
was recorded this cycle.

**Second consecutive cycle.** `docs/SESSIONS.md` (`v7.0.336`, 2026-08-30) records the identical
failure on all three narrowings. A repo sweep this cycle confirms **no ticket was ever filed for
it** — SES-255 is that ticket.

**Consequence, stated rather than left to be found.** SES-182's auto-rollback runs on a degraded
input: the anchor points at an older commit than `dev`'s head, so a later red is measured against a
stale baseline. It fails **safe** — a stale anchor cards rather than reverts, per step 4a's
asymmetric-fail note — but the charter's independent-verification claim rests on an anchor nothing
can currently write.

**A nuance the card understated, and it changes what a fix must do.** The proximate blocker is the
**tool-result size cap**; register B39 compounds it by making the overflow unreadable. A fix that
addresses only B39 and not the size does not close this.

**Decision boundary — do not assume.** The **credential route** (a narrowly scoped GitHub token in
`runner_secrets`) provisions a new secret and is **John's call**: a cycle taking that route must card
it, never do it. The **bounded-proxy route** (a `scripts/` helper that requests one run and prints
only `{name, conclusion}`) is ordinary cycle work and needs no new authority.

---

## SES-256 — the auto-rollback has never fired on a real red

**Status: VERIFIED.**

**The charter clause.** `docs/SELFBUILD-CHARTER.md` success-criterion 5, verbatim:

> *"5. **Resilience is drilled, not assumed.** One full restore-from-backup drill and one
> auto-rollback drill (red push reverted to green) have each been executed successfully and their
> evidence linked."*

The restore half is done and linked (`docs/runbooks/restore-from-backup.md`,
`docs/harvests/SES-191-redrill-2026-08-29.md`). **The auto-rollback half has never been run.**

**In-repo measurement.** SES-182 shipped complete in five slices (`v7.0.332`–`v7.0.336`) on
2026-08-30, and every one of its five guards runs on **fabricated fixtures** or inside a
deliberately-failing, rolled-back `DO` block:

- `tests/regression/SES-182-rollback-on-red.js` — fixtures + negative controls
- `tests/regression/SES-182b-migration-downs.js` — fixtures
- `tests/regression/SES-182c-deploy-serving-red.js` — fixtures
- `tests/regression/SES-182d-restore-plan.js` — fixtures + a rolled-back live-DB block
- `tests/regression/SES-182e-restore-apply.js` — live arms, all rolled back

None is end-to-end against a real red. No rollback-drill runbook exists anywhere in
`docs/runbooks/`, and no `docs/harvests/` entry records one.

**Why it matters beyond the checkbox.** The M3 gate review measured the verifier lane at **zero
confirmed true catches in 100 verdicts** (64 approve / 36 block, 34 of the 36 carrying SES-213's
known-false green/red/green signature). Auto-rollback is therefore the platform's only *mechanical*
safety net on a bad push — and it is untested in the one condition it exists for.

**Decision boundary — the half that fails closed.** A drill that deliberately seeds a **red on real
`dev`** is an outward-facing act with a live blast radius and is covered by **no** standing
authorisation. Directive `1c9609de` pre-authorises drill **dumps** (backups) only, explicitly not
this. A cycle wanting that route **must card it for John first**. A **controlled** drill — the engine
driven end-to-end against a scratch project (`SCRATCH_SUPABASE_SERVICE_KEY` exists) and a controlled
origin, exactly as SES-182 slice 3's own QA did with local origins — is ordinary cycle work.

**The open question, which belongs on a card and not in a cycle's judgment:** whether a controlled
drill *satisfies* criterion 5, or whether the charter means a real one.

---

## Proposed member 5 — not a ticket, and why

The review's fifth proposal was *"RE-MEASURE DAT-21's SCOPE AT THE SES-183 GATE rather than building
it as filed."* That is an instruction about an **existing** M4 member, not work of its own, so it is
recorded in drain directive `4583bdc1`'s body rather than filed as a ticket.

The two lenses split on it, and `gate-review.md` says a real split is worth more than a synthesized
consensus, so both positions stand unresolved for John:

- **Chief Architect — PROMOTE to gate-critical.** `rollback-on-red.js` deliberately classifies
  grant/ACL migrations `refused` and leans on the backup net as the fallback; DAT-21 says grants are
  never captured. M3 therefore made DAT-21 gate-critical to a shipped path.
- **PM — RE-MEASURE, do not build as filed.** M3 quietly delivered much of M4's backup floor
  (SES-216/220/223/241/242 plus the 99.996% drill), so DAT-21's *"never capture grants"* premise may
  be partly stale.

Both agree it matters more than its queue position (575) suggests. The measurement is cheaper than
either lens being wrong.

---

## The drain that was declared

`runner_directives 4583bdc1` (`type='drain-epic'`, epic *Selfbuild M4 - Infrastructure Floor*),
**8 named members**, fixed at declaration per `SES-142`:

| Ticket | Queue | Flag | Origin |
|---|---|---|---|
| `SES-183` — M4 design gate: infrastructure floor | 5 | `needs-john` | pre-existing member |
| `SES-47` — Vercel's 100-deploys/day cap is untracked | 247 | `needs-john` | pre-existing member |
| `SES-254` — `epic_id`'s contract is prose, not a constraint | 254 | — | named by the review |
| `SES-255` — no bounded CI-conclusion read | 255 | — | named by the review |
| `SES-256` — the auto-rollback drill is unexecuted | 256 | — | named by the review |
| `SES-244` — an unattended cycle cannot republish the briefing | 262 | `needs-john` | adopted from M3 |
| `DAT-21` — snapshots lost DDL capture, never capture grants | 575 | `needs-desktop` | pre-existing member |
| `HAR-34` — alert John when the spend gate blocks | 576 | `needs-john` | pre-existing member |

**Composition follows the M3 precedent rather than a judgment call:** directive `6810599f` named
the epic's then-open members **plus** the tickets filed straight after the preceding gate review
(19 + 4, read from `runner_drain_scope` joined to `backlog_items.created_at`). M4 is the same shape,
4 + 4. `SES-192` and `SES-193` are already `done` and deliberately **not** named.

**Expect at most three shipped tickets** (SES-254, SES-255, SES-256) before `drain_epic_next`
returns `blocked` citing exactly the five flagged holds — a clean, honest stop whose finish line is
John's briefing page, not any cycle's hands.
