<!-- DeepBench v7.0.341 | docs/runbooks/rollback-drill.md | SES-256 (Selfbuild M4) — THE AUTO-ROLLBACK
     DRILL RAN END TO END FOR THE FIRST TIME, and the thing to read twice is WHICH HALF OF CHARTER
     CRITERION 5 THIS CLOSES AND WHICH HALF IS STILL JOHN'S CALL. SES-182 shipped complete in five
     slices (v7.0.332-336) and every one of its five guards runs on FABRICATED FIXTURES or inside a
     deliberately-failing rolled-back DO block — verified in-repo this cycle across all five files.
     None had ever driven the engine over real git objects, and NOTHING had ever executed the
     revert_plan the engine emits. This runbook is that procedure, and it was written BY running it:
     every command below was executed at v7.0.341 and its real output is in
     docs/harvests/SES-256-rollback-drill-2026-08-31.md. THE BOUNDARY THAT IS NOT MINE TO CROSS, and
     it is the ticket's own: a drill that seeds a RED ON REAL dev is an outward-facing act with a
     live blast radius covered by NO standing authorisation (directive 1c9609de pre-authorises drill
     DUMPS only, explicitly not this) — so this runbook documents the CONTROLLED form and cards John
     for the other. Whether a controlled drill SATISFIES criterion 5 is HIS question, asked on the
     ship card rather than answered here; this file therefore does not mark criterion 5 scored, and
     a later cycle must not "finish" it by editing SELFBUILD-CHARTER.md on this drill's evidence
     alone. Guarded by tests/regression/SES-256-rollback-drill.js. -->

# Runbook — the auto-rollback drill (`SELFBUILD-CHARTER.md` success-criterion 5, second half)

**What criterion 5 asks for, verbatim:** *"One full restore-from-backup drill and one auto-rollback
drill (red push reverted to green) have each been executed successfully and their evidence linked."*
The restore half is done and linked (`docs/runbooks/restore-from-backup.md`,
`docs/harvests/SES-191-redrill-2026-08-29.md`). This file is the second half.

**What the drill proves, stated as the claim it actually supports:** that
`scripts/rollback-on-red.js`, **unmodified**, driven by real inputs, takes a genuinely-red commit and
produces a revert that restores the green tree — and that the plan it emits is *executable*, not just
well-formed. That last clause is the whole point. Every SES-182 guard asserts what the engine
*decides*; none had ever run what it *emits*.

---

## 0. The boundary — read before you pick a route

There are two ways to make a red, and they are not interchangeable.

| Route | What it is | Authorisation |
|---|---|---|
| **Controlled** (this runbook) | a scratch Supabase project + a controlled git origin; nothing outward-facing | **ordinary cycle work** — `SES-256`'s own decision boundary |
| **Real dev** | deliberately push a red to `dev` and let the live lane revert it | **John's, and his alone** — an outward-facing act with a live blast radius, covered by no standing authorisation. **Card it; never do it.** |

`1c9609de` pre-authorises drill **dumps**. It does not authorise this, and it says so explicitly. A
cycle that reads "drills are pre-authorised" and seeds a red on `dev` has widened its own authority
on an inference — the failure this platform keeps paying for.

**And do not assume the controlled route scores the criterion.** Whether it does is on `SES-256`'s
ship card as John's question. Until he answers, this runbook produces *evidence*, not a *score*.

---

## 1. Prerequisites

- The scratch Supabase project — `deepbench-restore-drill`, ref `itcimllfniypelrxsuoh` (**confirm it
  live with `list_projects`; never quote this ref from memory**). It is John's last free slot and the
  runner cannot delete it.
- `runner_secrets.SCRATCH_SUPABASE_SERVICE_KEY`, read **by name** through the connector. Never printed,
  never written to a file.
- Node and git in the session. No Vercel and no GitHub credential — the drill touches neither.

### 1a. The scratch project needs `runner_green_states`, and it will not have it

The scratch project was seeded from the 2026-08-28 restore snapshot, which **predates SES-182**. So it
carries `runner_cycles`, `runner_items` and `runner_before_images` and lacks
`runner_green_states`, `runner_migration_downs` and `plan_data_restore()` — measured, not assumed
(404 / 404 / 404 against its REST surface at v7.0.341).

Only `runner_green_states` is on the drill's path. **Mirror production's real definition — read it
from `pg_constraint`, do not retype it from this file:**

```sql
-- against the SCRATCH project, never production
create table if not exists public.runner_green_states (
  id uuid primary key default gen_random_uuid(),
  commit_sha text not null, ci_run_id text,
  observed_at timestamptz not null default now(),
  migration_watermark text, version text, observed_by_cycle uuid
);
alter table public.runner_green_states
  add constraint uq_runner_green_states_sha unique (commit_sha);
alter table public.runner_green_states
  add constraint ck_runner_green_states_sha_shape check (commit_sha ~ '^[0-9a-f]{7,40}$');
```

**THE UNIQUE CONSTRAINT IS LOAD-BEARING AND THE DRILL FOUND THAT BY FAILING.** `recordGreenState()`
upserts `ON CONFLICT (commit_sha)`; a mirror without it returns `42P10 there is no unique or
exclusion constraint matching the ON CONFLICT specification` and records no anchor. A mirror built
from a column list alone looks complete and is not.

**The other thing the drill found by failing:** `runner_before_images.cycle_id` is a foreign key to
`runner_cycles`, and the engine writes a before-image for the green record — so **the observing cycle
must exist as a row in the scratch project before the first call**, or the anchor write dies on
`23503`. Both of these are why step 2 seeds rows before it runs anything.

### 1b. The two things that are NOT on the drill's path, and why that is correct

`runner_migration_downs` and `plan_data_restore()` are absent from the scratch project and the drill
runs anyway. That is not a gap being tolerated:

- **`runner_migration_downs`** is read only when `--migrations` names something. This drill exercises
  the **code-only** path — the same watermark on both sides — so `readMigrationDowns()` returns
  early without an HTTP call. A drill that also wants the schema path must stand that table up too.
- **`plan_data_restore()`** 404s, the engine prints `could not read the data-restore plan: …` and
  **files the card anyway**. That is its documented fail direction (*"a plan that cannot be read is
  NOT a wall … refusing to card at all because the plan failed would trade a complete card for no
  card, on the one path where John most needs one"*), and the drill is the first time it has been
  observed rather than asserted. Treat that line as an **expected** drill output, not an error.

---

## 2. The procedure

Everything below runs against the scratch project. Export the two values from the connector read —
they never reach a file:

```
SUPABASE_URL=https://itcimllfniypelrxsuoh.supabase.co
SUPABASE_SERVICE_KEY=<runner_secrets.SCRATCH_SUPABASE_SERVICE_KEY>
```

### Step 1 — the controlled origin and a real green commit

A bare repo is the controlled origin; a clone is the working checkout. Put both **outside the repo**
so the drill cannot leave a stray file in the tree.

```
git init --bare -q "$D/origin.git"
git clone -q "$D/origin.git" "$D/work"
# app.js + check.js: a check that genuinely passes, and can genuinely fail
git -C "$D/work" add -A && git -C "$D/work" commit -q -m "green: app check passes"
git -C "$D/work" push -q origin HEAD:refs/heads/main
```

**Run the check and record its exit code.** A drill whose "green" was never observed green proves
nothing about the "red" that follows.

### Step 2 — seed the observing cycle, then record the anchor with the REAL engine

One `runner_cycles` row for the observing cycle (§1a's FK), then:

```
node scripts/rollback-on-red.js --apply --json \
  --cycle-id=<observing cycle id> --sha=<GREEN_SHA> \
  --run-id=<drill tag> --version=<version>-drill \
  --watermark=<a fixed drill watermark> \
  --jobs='[{"name":"Build (blocking)","conclusion":"success"},
           {"name":"Tripwire + regression (blocking)","conclusion":"success"}]'
```

Expect `record-green`. **Read the row back** — an exit code is not evidence a row landed.

### Step 3 — a red commit that is really red

Change the app so the check fails, commit, push. **Run the check and capture the failure output.**
"Red" means *an assertion actually failed*, never *a job was labelled failure in a JSON literal I
wrote*. This is the single most skippable step and the one that separates a drill from a fixture.

### Step 4 — THE NEGATIVE CONTROL, and it runs BEFORE the drill

Run the red **while no cycle claims that sha**:

```
node scripts/rollback-on-red.js --apply --json --trigger=ci-red \
  --cycle-id=<observing cycle id> --sha=<RED_SHA> --watermark=<same watermark> \
  --jobs='[{"name":"Build (blocking)","conclusion":"success"},
           {"name":"Tripwire + regression (blocking)","conclusion":"failure"}]'
```

Expect `action: none`, `applied: false`, and **zero cards filed**. It runs first for the
`SES-182e` reason: a control that runs after the thing it is controlling for can benefit from it.
Assert the card count, do not assume it.

### Step 5 — the drill: change ONE variable

Insert a `runner_cycles` row whose `push_sha` **is** the red sha, and re-run **the identical command
from step 4**. One variable, one difference in the result.

Expect `revert-and-card`, an `attribution` naming that cycle, the `greenAnchor` from step 2, a
`revertPlan`, and a `cardId`.

### Step 6 — EXECUTE the plan, verbatim

This is the step that had never been run. Take `revertPlan.command` **exactly as the engine emitted
it** — do not retype it, do not "clean it up":

```
git revert --no-edit --no-commit <GREEN_SHA>..<RED_SHA> && git commit -m "revert to green <GREEN_SHA>"
git push -q origin HEAD:refs/heads/main
```

### Step 7 — four proofs, and each answers a different question

| Proof | The question it answers |
|---|---|
| the check now exits **0** | *red push reverted to green* — the criterion's own words |
| `git diff --stat <GREEN_SHA> HEAD` is **empty** | the tree is byte-identical to the anchor, not merely "building again" |
| the red commit is still reachable in `git log` | revert-**forward**, not history rewrite — every existing checkout stays valid |
| the controlled **origin's** ref equals the new head | the fix reached the origin, not just the local clone |

Proof 1 without proof 2 passes on a revert that fixed the symptom and lost content. Proof 2 without
proof 3 passes on a `reset --hard` that would have invalidated every checkout. Keep all four.

### Step 8 — the second control: remove the anchor, re-run the red

Delete the green row and run step 5's command again (dry run is enough). Expect **`card-only`**,
reason *"no green state has ever been recorded — there is nothing to roll back to"*, and **no
`revertPlan`**. This is what proves the revert in step 5 depended on the anchor step 2 recorded,
rather than being what the engine does with any red at all.

### Step 9 — clean up, and verify in the same breath

Delete the card, the before-images, both drill cycles and the green rows; then **count them back to
zero**, and **assert production is untouched** — no drill sha in `runner_green_states`, no drill
cycle, no drill card, and production's newest anchor still the one its own step 4a recorded. A
cleanup whose result was not read is a cleanup that may not have happened.

Leave `runner_green_states` **in place** in the scratch project. It is drill infrastructure, it holds
no data between runs, and re-creating it every time is how the `42P10` above gets rediscovered.

---

## 3. What this drill does NOT prove — named, so nobody reads it as more than it is

- **It is not a real-dev red.** The blast radius, the deploy lag, Vercel's behaviour under a revert,
  and CI's own timing on `dev` are all untested by it. That is the gated route in §0.
- **It does not exercise the schema path.** `schemaPlanFor()`, captured downs and the newest-first
  ordering are code-only-bypassed here. A range with a migration is a **different drill**, and its
  scratch project needs `runner_migration_downs` too.
- **It does not exercise the deploy-red trigger.** `check-deploy-serving.js` has its own live arms
  (`SES-182c`); this drill drives `ci-red` only.
- **It does not test attribution against a real push.** The pushing cycle is a seeded row. What is
  real here is the *git history*, the *red*, the *decision* and the *revert*.
- **It proves nothing about the verifier lane**, which is not a rollback trigger and must never
  become one (John, 2026-08-30, card `2c136c5b` Q1).

## 4. Cadence

Re-run it when `scripts/rollback-on-red.js`'s decision surface changes — `decide()`,
`revertPlanFor()`, `attributionOf()`, `TRIGGER_SOURCES` — and at each Selfbuild milestone gate review
that inherits criterion 5. `tests/regression/SES-256-rollback-drill.js` fails when this file's
documented command drifts from what `revertPlanFor()` actually emits, so drift is caught by CI rather
than by the next person to open this file.
