<!-- DeepBench v7.0.527 | harvest | SES-422 slice 2 — design reasoning (cycle ef4e9a0b-e0a4-49a2-b180-05509766f187, 2026-09-19). Slice 1's harvest (v7.0.526, cycle 405e2725) precedes this block when the platform appends. -->

# SES-422 — harvest for slice 2, SES-407 (the Designer's measurements and choices)

Not required reading for the build. Every fact a task depends on is in `docs/kickoffs/v7.0.527-SES-422-before-image-key-is-pk.md`.

## 1. Premise revalidation — alive, and still growing

All measured live this cycle on the deployed database, never recalled.

| Claim | Live measurement | Verdict |
|---|---|---|
| `runner_before_images` rows for `backlog_items` carry `backlog_id` text in `pk_value` | 3,254 images with `table_name='backlog_items'`; **425** fail `~* '^[0-9a-f]{8}-…-[0-9a-f]{12}$'`. 418 at filing (2026-09-16), 423 at slice 1 (2026-09-19 early), 425 now. Newest: `SES-422` at 2026-09-19 07:03Z by cycle `405e2725` (slice 1 itself, `v7.0.526`, `shipped`) — an UPDATE image of the ticket row (`status open`, `design_status null`), `decision_id NULL`. | alive, recurring |
| `reverse_decision()` cannot address them | Its body (read from `pg_proc` this cycle): `execute format('select ($1::text)::%s', v_pk_type) using r.pval` inside a `begin … exception` block; a failed cast sets `v_castfail` and the row is counted `refused`. `backlog_items`' pk is `id uuid`. So a text key is refused on every reverse. The runbook's own note at `runner-cycle.md:3633` records the same measurement (`refused=1`). | confirmed by code path |
| Spread | 421 `decision_id NULL`, 4 on decisions (all `final`: `33e81841` hygiene AGT-79, `91e75dd4` filing SES-407, `a0029f68` hygiene SES-344, `aa0eb223` filing SES-387). 203 cycle-attributed, 222 session-attributed. 326 UPDATE images (`row_data` set), 99 INSERT images (`row_data NULL`, newest 2026-09-16 03:51Z). 240 distinct keys. Oldest 2026-08-20. | — |
| Mappability | Exact `backlog_id` match: **408**. Leading token `^([A-Z]+-[0-9]+[a-z]?)`: **14** more (`SES-138 (new insert)`, `SES-145 (INSERT)`, `SES-198 (new row)`, `SES-229/230/248 (insert)`, `SES-236/237/238 (pending insert)`, `LOG-145 (new row)`, `SES-86 (desc correction)`, `SES-86 (desc trim to harvest pointer)`, `SES-91#285`, `SES-97 (desc correction)`). Residual **3**: `(schema) queue column + recompute_backlog_queue()`, `QA-FIXTURE-QA-SES111`, `new-SES-231`. `uq_backlog_items_backlog_id` is a UNIQUE index; 0 live ids end in a letter, so the token map is one-to-one and the `[a-z]?` guards a future `SES-141a`, not a live case. | 422 repairable, 3 not |
| Ticket rows | `SES-407`, `SES-411`, `SES-287` all read `status = 'removal proposed'` on the board — folded into `SES-422` (`partial`, claimed by this cycle). The row status is not the premise; the data is. The SES-422 title's "418" is stale. | — |

Verdict: **alive**. Slice 2 as named by the slice-1 STOP LINE, unchanged in scope.

## 2. Who writes the wrong key — measured, because it decides the fix shape

- **DB functions.** Of the 17 `public.*` functions whose body inserts into `runner_before_images` (scanned in `pg_proc`), the two that image `backlog_items` use the uuid: `file_invention_proposal` (`v_new_id::text`), `runner_items_accept_clears_flag` (`r.id::text`). `record_skip` builds a text key, but for `runner_skips`. No function is the source.
- **Runbook templates.** `runner-cycle.md:3631-3633`, `session-setup.md:383-384` and `:580-581`, `gate-review.md:196-260` all image with `id::text` / `v_img->>'id'`. The docs already say the right thing; this slice edits none of them.
- **JS scripts.** Eight sites write `backlog_items` images. Seven pass `row.id` / `r.id` / `a.id` or a minted uuid (`heal-engine.js:1477` mints `crypto.randomUUID()` and inserts `{ id: rowId, ...draft }` — the pattern task 2 copies). **One** passes the ticket id: `scripts/tripwire-to-backlog.js:622` and `:699`, `insertBeforeImage(base, key, cycleId, backlogId)` — the 99 INSERT images (82 cycle-attributed).
- **Hand-written SQL.** The remaining 326 UPDATE images (205 session-attributed: `design-m5-milestone-0902` 147, `design-ses-295-0902` 25, `design-governance-review` 8 …; 121 cycle-attributed, including today's) come from orchestrators and attended sessions writing `pk_value = 'SES-xxx'` by hand despite the templates. No repo file can reach that writer. That is why the guard lives on the table.

## 3. The fix shape, and the alternatives set aside

**Chosen: a `BEFORE INSERT OR UPDATE OF pk_value` trigger that resolves or refuses.** For `backlog_items` only: a text key that equals a live `backlog_id` is rewritten to that row's uuid (the "helper every writer uses", hosted at the one place every writer must pass: PostgREST, MCP SQL, functions, hand SQL); one that resolves to nothing raises `check_violation` naming `SES-407` and the client-side mint. The INSERT-image case forces the refusal arm: the ticket row does not exist yet when its image is written, so the key cannot be resolved and must be minted by the caller — what `heal-engine.js` already does and what task 2 makes `tripwire-to-backlog.js` do. Without task 2 the trigger would turn every tripwire filing into an exit 2 (`fail(2, …)` at `:623`/`:700`), which is why the script edit ships in the same slice.

- **A plain CHECK.** Reaches every writer, but refuses the 326-row class outright instead of fixing it, and cannot be added while 3 unresolvable rows remain without `NOT VALID`. The ticket itself preferred the helper.
- **A JS helper module every script imports.** Eight writer files plus their tests: far over the 3-file cap, and it still does not reach hand-written SQL, the larger producer.
- **Resolving the 3 residual keys by hand.** `QA-FIXTURE-QA-SES111` was a QA fixture, `(schema) queue column …` a DDL note, `new-SES-231` a filing whose row id nobody recorded. All three are 2026-08-21..29 attended-session prose, `decision_id NULL`, never machine-addressable. Guessing a uuid for them would be authoring a before-image from memory. Left in place, named; the trigger refuses their kind from now on.
- **Generalising the guard to every table in `reversible_tables()`.** Right direction, but `runner_ladder`/`ip_org_cache` images legitimately carry text keys (`work_class`, `caller_ip`) and a per-table pk-type lookup is a bigger function than this slice proves. Stated as not done.

## 4. Reversibility of the repair itself

Every write in task 1 carries a before-image: the repair decision `v_dec` (kind `repair`, `backlog_id` `SES-422`, this cycle's id in `cycle_id`, `session_name NULL`) owns one image per repaired image — `table_name = 'runner_before_images'`, `pk_value` = the repaired image's id, `row_data` = `to_jsonb(<the image row as it was>)` — the exact shape cycle `0e57cedd` used for its five-row repair under decision `74ed56bd-d843-460e-9941-83cd83e96d78` (measured: 5 images, `prior_pk` `SES-403/405/406/364/403`).

`reverse_decision()` deliberately keeps `runner_before_images` off `k_allowed` ("the runner's OWN record of the decision"), so a Reverse of `v_dec` will report those rows `refused`. The undo is therefore one statement, from the images themselves:

```sql
update public.runner_before_images bi
   set pk_value = img.row_data->>'pk_value'
  from public.runner_before_images img
 where img.decision_id = '<v_dec>' and img.table_name = 'runner_before_images'
   and img.pk_value = bi.id::text;
```

The trigger fires `on update of pk_value` and would re-resolve those text keys straight back to the uuid — so an operator running the undo must `alter table public.runner_before_images disable trigger trg_before_image_key_is_pk` around it, or drop the trigger first via the captured down. Stated here so the undo is not discovered to be a no-op at the moment it is wanted.

The DDL half (function + trigger) is captured by `capture_migration_down` before the up: both objects are new, so both capture as `existed: false` and the down is two drops — `auto-downable`, 2 captured, 0 refused.

## 5. Lane choice

`judgment` → `claude-fable-5-1` (lanes read live this cycle: orchestrator `claude-opus-5`, judgment `claude-fable-5-1`, mechanical `claude-sonnet-5`). The edits are short but the failure modes are quiet: a trigger that rewrites the wrong key, a backfill that maps `SES-141a` onto `SES-141`, a repair without its images, a tripwire that stops filing. Each is data damage nobody sees until a Reverse is wanted.

## 6. Baseline red set (unchanged tree, this cycle)

```
- tests/regression/SES-205-tripwire-backlog.js — green
- tests/regression/SES-150-before-image-attribution.js — green
- tests/regression/ses-399-attach-fails-closed.test.mjs — green
Red set: 0 of 3
```

The slice's own test is a new file, so it has no baseline. The three above are the existing guards on the surfaces this slice touches: `SES-205:218-219` pins the order `insertBeforeImage` before `insertTicket` in `tripwire-to-backlog.js` (task 2 keeps both literals); `SES-150` pins `ck_before_image_attribution` on this table via the live rejection path (the shape task 3's arm (a) copies); `ses-399` reads `reversible_tables()` and the attach guard live. PostgREST's `imatch` operator was checked live for arm (b): `pk_value=not.imatch.<UUID_RE>` with `Prefer: count=exact` returned `content-range 0-0/425`.

## 7. Facts checked and left alone

- `runner_before_images` constraints today: `ck_before_image_attribution` (exactly one of `cycle_id`/`session_name`), `ck_before_image_session_name_nonempty`, FKs to `runner_cycles` and `runner_decisions`, pk. **No triggers** exist on the table yet (`pg_trigger`, non-internal: 0).
- `runner_decisions.kind` is unconstrained (`status` is the CHECKed column: open/final/reversed), so `kind = 'repair'` and the QA's `kind = 'qa'` are both accepted; `backlog_id` must match `^[A-Z]+-[0-9]+[a-z]?$` — `SES-422` does.
- `capture_migration_down` accepts `trigger` identities as `"<name> on <schema.table>"` and function identities schema-qualified with an argument list — the two objects in task 1 are spelled that way.
- The ledger holds 8,190 rows in total; the backfill changes 422 `pk_value`s and adds 422 images; the count of `backlog_items` images (3,254) is unchanged by design, which is what arm D reads.
- `docs/runbooks/runner-cycle.md` is not touched (380,902 bytes against the 381,000 ceiling); its step-7b template is already correct.

## 8. Residue for the next cycles (stated in the kickoff's STOP LINE)

1. **Slice 3 — SES-411.** An Auditor check deriving expected refusals from `governance_rules` (M5-16, M5-15, M5-06, M6-09) and comparing with the live function body and the test's REASONS set; QA against the captured down of `ses410_weekly_pace_stop`.
2. **SES-287.** Re-measure `readGreenAnchor()` against `ci_run_conclusions` once more and propose closing the row as shipped (v7.0.452 / v7.0.507 / v7.0.525). No build.
3. Generalising the key guard beyond `backlog_items` (§3, last bullet) is a genuine discovery only if a second table shows the same defect; none was measured this cycle, so nothing is filed.
