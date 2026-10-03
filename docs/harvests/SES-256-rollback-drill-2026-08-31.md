<!-- DeepBench v7.0.341 | docs/harvests/SES-256-rollback-drill-2026-08-31.md | SES-256 (Selfbuild M4)
     The evidence for the first end-to-end auto-rollback drill. Every number and every string below
     was produced by a command run in cycle 69725495 on 2026-08-31; nothing here is quoted from a
     ticket. Procedure: docs/runbooks/rollback-drill.md. Guard:
     tests/regression/SES-256-rollback-drill.js. -->

# `SES-256` — auto-rollback drill, 2026-08-31

**Cycle** `69725495-024c-473d-9731-441f12ba5dc3` · **version** `v7.0.341` · **route** controlled
(scratch Supabase project + controlled git origin) · **outcome** the drill succeeded end to end.

**What this is evidence OF, and the sentence matters:** that `scripts/rollback-on-red.js`,
**unmodified**, driven over **real git objects** by a **genuinely failing check**, produced a revert
plan that **was executed** and **restored the green tree**. It is *not* evidence that a red on real
`dev` reverts — see "Not proven" below, and `SES-256`'s ship card, where that question is John's.

---

## 1. The gap, re-measured this cycle rather than taken from the ticket

| Claim | How it was checked | Result |
|---|---|---|
| no rollback-drill runbook exists | `ls docs/runbooks/ \| grep -i "rollback\|drill"` | **none** |
| no harvest records such a drill | `ls docs/harvests/ \| grep -i "rollback\|drill"` | only `SES-191-redrill-*` (the *restore* half) |
| all five `SES-182` guards are fixture-based | grep for fixture / rolled-back-transaction markers across `tests/regression/SES-182*.js` | **5 of 5** matched |

Premise **holds**. `revalidated_at` set on the ticket, before-image first.

## 2. The controlled environment

- Scratch project `deepbench-restore-drill`, ref `itcimllfniypelrxsuoh` — **confirmed live via
  `list_projects`**, not quoted from a doc.
- Its REST surface, probed before anything ran: `runner_cycles` **206**, `runner_items` **206**,
  `runner_before_images` **206**, `runner_green_states` **404**, `runner_migration_downs` **404**,
  `rpc/plan_data_restore` **404**. A wrong-key control returned **401** on all five tables first, so
  the 206s are a real grant and not an open table.
- `public.runner_green_states` was mirrored into the scratch project (migrations
  `ses256_drill_green_states`, `ses256_drill_green_states_constraints`).

### Two setup defects the drill found by failing, both now in the runbook

1. **`42P10 there is no unique or exclusion constraint matching the ON CONFLICT specification`.**
   `recordGreenState()` upserts on `commit_sha`. The first mirror was built from a column list and
   *looked* complete; production also carries `uq_runner_green_states_sha` and
   `ck_runner_green_states_sha_shape`, read from `pg_constraint` and then mirrored.
2. **`23503 … violates foreign key constraint runner_before_images_cycle_id_fkey`.** The engine
   writes a before-image for the green record, so **the observing cycle must already exist as a
   `runner_cycles` row**. Both failures are recorded here rather than smoothed over: they are the
   two things a second person running this drill would otherwise rediscover.

## 3. The arms

Controlled origin: a bare repo; working clone; `app.js` + `check.js` (an assertion that really
passes and can really fail).

| # | Arm | One variable | Result |
|---|---|---|---|
| 1 | green commit `dc51779` pushed; check run | — | `[PASS] app check`, **exit 0** |
| 2 | engine `--apply`, green jobs | — | `record-green`; row read back: `commit_sha=dc51779…`, `watermark=20260831000000` |
| 3 | red commit `ec7d77b` pushed; check run | app output changed | `AssertionError: 'hello, dev!' !== 'hello dev'`, **exit 1** — a *real* red |
| 4 | **negative control** — red, no cycle claims the sha | *runs first* | `action: none`, `applied: false`, **0 cards filed** |
| 5 | **the drill** — identical command | a `runner_cycles` row now carries `push_sha=ec7d77b…` | `revert-and-card`, card `adb75f6d`, `revertPlan` emitted |
| 6 | **execute `revertPlan.command` verbatim** | — | revert commit `21f47cb`, pushed to the controlled origin |
| 7 | **second control** — anchor deleted, red re-run | the green anchor | `card-only`, *"no green state has ever been recorded"*, **no `revertPlan`** |

Arm 4 runs **before** arm 5 for the `SES-182e` reason: a control that runs afterwards can benefit
from the state the thing it controls for has already written. Arms 4 and 5 are the **same command**;
the only difference is attribution, so the difference in outcome is attributable to that alone.

### The four proofs on arm 6

| Proof | Observed |
|---|---|
| the red check is green again | `[PASS] app check`, **exit 0** |
| the tree matches the anchor | `git diff --stat dc51779 HEAD` → **empty** |
| revert-forward, not rewrite | `git log dc51779..HEAD` → `21f47cb revert to green…`, `ec7d77b red:…` — the red commit is **still reachable** |
| the origin has it | `git -C origin.git rev-parse refs/heads/main` → `21f47cb…` |

**The engine's own decision text, verbatim:** *"ci-red (Tripwire + regression (blocking)=failure) on
unattended push ec7d77b9…; the migration watermark is unchanged at 20260831000000, so the range is
code-only and reversible by revert-forward."*

### A documented fail-direction observed for the first time

`plan_data_restore()` is absent from the scratch project, so the engine printed
`could not read the data-restore plan: HTTP 404 …` **and filed the card anyway**. That is exactly what
its header promises (*"a plan that cannot be read is NOT a wall … refusing to card at all would trade
a complete card for no card, on the one path where John most needs one"*). Until this drill that
sentence had never been executed.

## 4. Cleanup, and both directions asserted

Scratch, after cleanup: `green_rows 0`, `drill_cycles 0`, `incident_cards 0`, `drill_images 0`.

**Production, asserted in the same breath:** `drill_anchors_in_prod 0`, `drill_cycle_in_prod 0`,
`drill_cards_in_prod 0`, and production's newest anchor still
`506efeee8d6f7191c03a14016b3f3230cdb5e305` — the anchor **this same cycle** recorded at its own step
4a. Zero blast radius, measured rather than asserted.

## 5. The guard, and a vacuity it caught in itself

`tests/regression/SES-256-rollback-drill.js` compares the runbook's documented command against
`revertPlanFor()`'s **actual** return value, and checks the trigger vocabulary, the two `--jobs`
examples, and the authorisation boundary. Five mutations, tree restored byte-identical (`sha256`
compared) and re-passing after each:

| Mutation | Guard |
|---|---|
| revert command → `git reset --hard` | **FAIL** |
| green `--jobs` example → `cancelled` | **FAIL** |
| "Card it; never do it" dropped | **FAIL** |
| runbook claims the verifier is a trigger | **FAIL** |
| "produces evidence, not a score" dropped | **PASSED — a real hole, fixed** |

**Reported rather than quietly re-rolled.** The fifth mutation *passed* on the first build: the
assertion searched the whole file, and the provenance stamp restates the same sentence, so deleting
it from the **body** left the guard green. The assertion now runs against the body with HTML comments
stripped, and the same mutation fails. A second process defect is recorded for the same reason: the
first mutation battery restored with `git checkout --` on files that are **new and untracked**, which
silently does nothing, so three mutations accumulated in the tree before it was noticed. Both
batteries were re-run from a real backup, and the byte-identity check is what caught it.

## 6. Not proven — so that nobody reads this as more than it is

- **A real-`dev` red.** Blast radius, Vercel's behaviour under a revert, and CI's live timing on
  `dev` are untested. That route is John's alone (directive `1c9609de` pre-authorises drill *dumps*
  and explicitly not this) and is asked on the ship card.
- **The schema path.** Code-only throughout: `schemaPlanFor()`, captured downs and the newest-first
  ordering were not exercised.
- **The deploy-red trigger.** `ci-red` only.
- **Attribution against a real push.** The pushing cycle is a seeded row; the *git history*, the
  *red*, the *decision* and the *revert* are real.

## 7. Criterion 5 is NOT marked scored by this document

`SELFBUILD-CHARTER.md` is deliberately unedited. Whether a controlled drill satisfies
*"executed successfully"* is `SES-256`'s open question and belongs to John — writing the score here
would answer it on the runner's own say-so, which is the authorisation defect this platform keeps
paying for. `docs/SELFBUILD-CHARTER.md` gets its link when he answers.
