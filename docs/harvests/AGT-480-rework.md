# AGT-480 — harvest (Designer reasoning; not required reading for the build)

Cycle `05299e3e-01f5-427b-af15-3bb60021d3ec`, version `v7.0.853`, tree `8bdf754`, 2026-10-17. Kickoff: `docs/kickoffs/v7.0.853-AGT-480-victoria-placed-origin.md`.

## 1. Premise revalidation (live, this cycle)

- `pg_constraint` on `backlog_items`: `ck_backlog_scope_origin` = `CHECK (scope_origin IS NULL OR scope_origin = ANY (ARRAY['original','gate-review','john-named','discovered','pre-existing','enhancement']))` — six values, no `victoria-placed`.
- `pg_get_functiondef('public.epic_lock_guard()')` md5 `05432ca5c8c72907cef83d676cc9c6a2` (the value AGT-450's GATE pinned): early returns for `epic_id IS NULL`, unchanged `epic_id`, `scope_origin = 'john-named'`; then refuses a locked epic whose project does not `accepts_findings`.
- No `public` function body contains `victoria-placed`, `victoria_placed` or `victoria_door` (pg_proc scan, prokind 'f').
- `scope_origin` distribution: null 659, discovered 394, john-named 198, gate-review 58, original 34, pre-existing 21, enhancement 1 (1,365 rows).
- `scripts/requirement-check.js:506`: `if (!proj || proj.status !== "executing" || (proj.accepts_findings !== true && !johnSource))` → `die(1, …)`; `scripts/audit-review.js:152-154` `homeAccepts(row, needSource)` holds the same two limbs.
- `apply_requirement_verdict(uuid,text,jsonb)` md5 `a162dba478ef4b742739a8b14f21eb27`, SECURITY DEFINER; its homing UPDATE writes `scope_origin = case when split_part(coalesce(v_src, ''), ':', 1) = 'john' then 'john-named' else scope_origin end`.
- `requirement_gate()` md5 `33191bd23a6f82d2cd5c630f82de1180`; `reverse_decision` is NOT security definer; `backlog_items` grants: `postgres` and `service_role` only (anon holds nothing).
- Decision 25 in `docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md` (John, 2026-10-13): option B, a new origin the lock accepts, for any source; NOT applied; rejected `accepts_findings`.

Premise ALIVE.

## 2. Governing architecture

§19v Operations (AGT-240 lock, AGT-264 accepts_findings, AGT-280 need_source, AGT-309 the decision-gated move, AGT-450 the john-source door); §19b/§19k (logging: one decision + one before-image per move — `apply_requirement_verdict()` already does this); §19d/§19e Rule #1 (no agent named in another's data — the token names a function, not an agent).

## 3. Mechanism chosen, and the alternatives

**Chosen — a transaction-local door token.** `apply_requirement_verdict()` runs `set_config('deepbench.victoria_door','apply_requirement_verdict', true)` around its homing UPDATE; `epic_lock_guard()` admits `victoria-placed` only while the token reads; a new `scope_origin_door` trigger refuses any INSERT/UPDATE that sets `scope_origin = 'victoria-placed'` without it. `is_local = true` dies with the transaction; PostgREST wraps every request in one, and no PostgREST writer can call `set_config` (pg_catalog is not exposed). Precedent in this database: `model_assignments_sync_lanes` sets `deepbench.lane_sync`, `runner_model_lanes_guard` reads it (pattern:17).

Rejected:
- *The lock accepts the value unconditionally (like john-named).* A Builder could PATCH `epic_id` on an already-placed ticket into another locked epic — the ticket says "every other writer stays refused". The token closes it at zero cost.
- *Refuse by `current_user`/`session_user`.* PostgREST runs every service-key request as `service_role`, as does the runner — role tells the writers apart from nothing.
- *Decision-presence only (requirement_gate's AGT-309 clause).* Already holds; does not stop a hand-written stamp.
- *`accepts_findings` on active projects.* Rejected by John (decision 25).

## 4. Measurements the tasks rest on

- Executing, non-accepting projects and their epic counts (live): `tooling` 2, `go-to-market` 1, `dev-manager-capabilities` 2. The writer's `v_rc <> 1` ("one executing project with one epic") makes `go-to-market` (epic `589f2d4b-3a2a-4d25-960c-040d36ccdbaa`, locked 2026-10-13 22:48Z) the only legal `home_project` today. `dev-mgr-findings` is planned, one epic `48c63dac-4e5e-4287-8e72-01777fedbbf2`, unlocked.
- `runner_settings.need_source_kinds` = john:runner_directives, john:runner_decisions, john:napkin_ideas, nathan:market_records, jerry:knowledge_entries — no auditor/dev-manager pair exists; a ticket from those agents still cites one of these five. Not this ticket's cause.
- `market_records` row `fbaa1d6e-06e4-4015-b0fe-b4915fa7bfef` exists (NSRC traceable).
- `governance_rules.FILE-MATRIX` statement (md5 `7de2843b3f7db6a58ac4992ab766c931`) holds exactly one `scope_origin (original / gate-review / john-named / discovered / pre-existing / enhancement)`; `tests/regression/agt-93-enhancement-filing-lane.test.mjs` grades BOTH `docs/governance/RULES-SNAPSHOT.md` (FILE-MATRIX row) and `docs/runbooks/session-setup.md:284` against the values live rows carry — a fixture carrying `victoria-placed` while that test runs would fail both unless the docs list it. Hence T1(f)+T6. `governance_rules` has no triggers; it is in `reverse_decision()`'s allowlist; precedent decision kind for a statement amendment: `governance` (6 rows).
- `skill_profiles.dm-audit-review-intent.method` mentions `accepts_findings` only in AGT-264's routing exception — not Victoria's door; untouched.
- `docs/runbooks/runner-cycle.md` is 380,978 bytes against the 381,000 ceiling — nothing in this kickoff edits it.
- `capture_migration_down()` refuses an EXISTING constraint ("the up replaces it"); the runbook calls that a RESULT (card-only red range), not an error — hence T1(a)'s expected `refused`, 4, 1.
- `pg_default_acl` grants EXECUTE on new functions to anon/authenticated by name (`.claude/rules/supabase-column-grants.md`, SES-315) — hence the explicit revoke + `has_function_privilege` assertion on `scope_origin_door()`.
- Baseline: `node scripts/baseline-red-set.js --tests=…` on the unchanged tree: agt-309 RED (arm D: "requirement-check must hold exactly 1 Knowledge link; got 3", live-state); agt-450, agt-280-requirement-gate, agt-240, agt-93 green. agt-450 arms 1-2 and agt-309 arms B-C print NOT RUN because `tooling` / `dev-manager-capabilities` now hold two epics.
- Anchor counts (`git grep -F -l`, excluding docs/kickoffs/ and docs/harvests/): every kickoff anchor measured 1 file except none; `IF coalesce(NEW.scope_origin, '') = 'john-named' THEN RETURN NEW; END IF;` is in 4 design SQL files and `pre-existing / enhancement)` in 3 (RULES-SNAPSHOT + two audit files) — both left out of the block because the build edits the LIVE function and the regenerated snapshot, not those files.

## 5. Designer's calls (JOHN-0925-DESIGNER-DECIDES; each reversible with the ship decision)

1. Door = transaction-local GUC `deepbench.victoria_door`, value `apply_requirement_verdict`.
2. `epic_lock_guard()` admits `victoria-placed` ONLY inside the door; `john-named` keeps its unconditional pass (John's naming, AGT-450).
3. Writer rule: a `john:` source, or a row already `john-named`, stamps `john-named`; every other homing stamps `victoria-placed`. Never overwrite John's stamp with hers.
4. `--home` and `homeAccepts()` admit any `executing` project; the `needSource` parameter is removed rather than left dead. Refusal strings cite `(AGT-240, AGT-480)`.
5. The seventh value is written into FILE-MATRIX (under its own `governance` decision + before-image) and the filing template in the same ship (pattern:163); RULES-SNAPSHOT regenerated.
6. The new test picks HOME by live shape (executing, non-accepting, exactly one locked epic) instead of a hardcoded slug — agt-450's hardcoded `tooling` went dormant in two days.

## 6. Discovery to file (evidence; not fixed here — pattern:65/96)

`apply_requirement_verdict()`'s `v_rc <> 1` one-epic rule, plus the `Victoria Fill - …` epics added 2026-10-13, means `home_project = 'tooling'` and `'dev-manager-capabilities'` raise `AGT-309: home_project % is not one executing project with one epic` for EVERY source, john-named included — so after AGT-480 Victoria can place into `go-to-market` only. AGT-489 (her list door, "best-fit active project") is the natural home for an epic-level destination; until then the gap stands. Second observation, same class: `need_source_kinds` holds no auditor/dev-manager pair, so an Auditor ticket is graded only through a john/nathan/jerry citation.

## 7. Residue declared

- `reverse_decision()` (not SECURITY DEFINER, no token): reversing the MOVE works — `scope_origin` goes back to its prior value and `epic_id` to the unlocked list. Restoring a row INTO `victoria-placed` from another value, or moving a victoria-placed row's `epic_id` back INTO a locked epic, outside the door is refused per row and REPORTED (`refused` count), never silent. Accepted; the one-call undo the ticket asks for is the move's own reversal.
- The card-only red range from the constraint swap (capture refused by design).

## 8. Sources opened

Ticket row; `docs/design/VICTORIA-FILL-REQUIREMENTS-1013.md` (decisions 12, 25, 34, Open); `docs/design/agt-450-john-source-door.sql`; `docs/kickoffs/v7.0.846-AGT-450-john-source-door.md`; `docs/kickoffs/v7.0.448-SES-368-weekly-pace-gate.md`; `tests/regression/agt-450-john-source-door.test.mjs`, `agt-309-process-break-class.test.mjs`, `agt-93-enhancement-filing-lane.test.mjs`; `scripts/requirement-check.js`, `scripts/audit-review.js`, `scripts/verifier.js` (lane/anchor/model findings, KICKOFF_BYTE_CAP), `scripts/baseline-red-set.js`, `scripts/export-governance-snapshot.js`; `docs/ARCHITECTURE.md` §19v; `docs/runbooks/runner-cycle.md` (migration-down block); `docs/runbooks/session-setup.md:284`; `docs/runbooks/auditor-routine.md:117`; live: pg_proc/pg_constraint/pg_trigger, `runner_model_lanes`, `runner_settings`, `projects`, `epics`, `governance_rules`, `skill_profiles`, `information_schema.role_table_grants`.

---

## 9. Re-design (cycle `24c6550e-6304-4d91-8000-0d4d8f070d1a`, 2026-10-17) — the agt-93 guard correction

Kickoff: `docs/kickoffs/v7.0.853-AGT-480-victoria-placed-rework.md` (the v7.0.853 kickoff above is spent: its anchors describe the pre-build tree — e.g. `(proj.accepts_findings !== true && !johnSource)`, a literal its own T2 deleted — so `scripts/verifier.js --check-kickoff` exits 1 on it).

### 9.1 Premise revalidation (live, this cycle)

- Clone: branch `session/cycle-20261017-2141` = origin/dev `212bc18` + cherry-picks `94c9843` (kickoff + harvest) and `bfb4c89` (the 10-file build) = 12 files, +1286/−94. Working tree clean.
- `pg_constraint.ck_backlog_scope_origin` = seven values ending `'victoria-placed'`; `supabase_migrations.schema_migrations` holds `20261017193009 agt480_victoria_placed_origin`; `pg_proc` md5s `apply_requirement_verdict` 9983927c…, `epic_lock_guard` b495f574…, `scope_origin_door` bda113d1…, each body containing `victoria-placed`; triggers `epic_lock_guard` and `scope_origin_door` both present. `governance_rules.FILE-MATRIX` statement carries `enhancement / victoria-placed)`; `node scripts/export-governance-snapshot.js --check` exits 0 (sha256 b6046b48…).
- `scope_origin` distribution: null 659, discovered 395, john-named 198, gate-review 58, original 34, pre-existing 21, enhancement 1 — zero `victoria-placed` (the predecessor's fixture was reversed).
- `runner_decisions` 9b8fb462 (kind `gate`, cycle 21b69eed, 2026-10-17 20:53Z): REWORK; "The change is right; the test is wrong … The ticket must carry the one-file guard correction so both land in one push." `runner_items` b154c8eb: `decision = rework`, `dev_link` names branch session/cycle-20261017-1841 @ f80061dc. The ticket's `scope_rationale` now says the same and names the correction: "a documented-but-unused constraint value is declared, not failed".
- `node tests/regression/agt-93-enhancement-filing-lane.test.mjs` exits 1: `docs/governance/RULES-SNAPSHOT.md documents scope_origin value(s) victoria-placed that no live row carries`. `scripts/baseline-red-set.js` over that one file: Red set 1 of 1. The cycle's `pre-build-baseline-24c6550e.txt`: 7 red of 54 (agt-132, agt-159, agt-309, agt-70, agt-86b, agt-86i, agt-93).
- `runner_model_lanes.orchestrator` = `claude-opus-5` (the Model: line); judgment `claude-fable-5-1`, mechanical `claude-sonnet-5`.

Premise ALIVE — but only the ruled residue: the test, then the ship.

### 9.2 Why a declaration, and what it does not do (Designer's call, JOHN-0925)

The test grades the live arm against `distinct scope_origin` over rows because PostgREST exposes no `pg_constraint` (its own header, and ses-309/ses-282). That is a lower bound, so direction 2 ("nothing documented may be a value the platform would refuse") was never decidable from the sample — a documented value no row carries is EITHER a constraint value nothing has filed under yet OR an invented one, and the only read-only way to tell them apart is a write the test may not make (pattern:76, no throwaway rows on the board). Alternatives weighed:

- *A `pg_get_constraintdef` RPC the test calls.* Two files (migration + test), a new public function with the SES-315 grant dance, for a check that already has a sound direction 1. Beyond the ruling's "one-file".
- *A writing probe (PATCH the value onto a row, inspect the refusal).* `scope_origin_door` refuses `victoria-placed` BEFORE the CHECK is evaluated (BEFORE trigger ordering), so a door refusal proves nothing about the constraint; and an ACCEPTED probe would write to the board. Unsound and unsafe.
- *Chosen: declare.* Direction 2 becomes a named `notRun()` per home listing the unsampled values; the first row that carries the value folds it into direction 1 and the declaration disappears on its own (pattern:162 — a check grades the change, never the live world; pattern:34 — honest absence). An invented value still surfaces as a refused write the first time a filing uses it.

What is lost: a documented value the constraint would refuse is no longer caught by this file. Accepted: the two-homes arm still catches a half-ship, and the value set is governed by the migration that adds it (AGT-93's own mechanism).

### 9.3 Measurements the tasks rest on

Prototyped in a scratch mirror of the tree (clone untouched): after H1+D2+N1 the file is 20,035 bytes (from 19,163); credentialed run exits 0 with `[PASS]` and three NOT RUN parts (RULES-SNAPSHOT.md, session-setup.md, and the trailing one); uncredentialed run exits 0 with the single `the live arm` NOT RUN. Teeth control: with `enhancement` dropped from BOTH homes the test exits 1 with `FILE-MATRIX enumerates 6 scope_origin values (discovered / gate-review / john-named / original / pre-existing / victoria-placed); the database admits 6 -- missing: enhancement` — direction 1 is untouched. Anchor counts (`git grep -F -l`, excluding docs/kickoffs/ and docs/harvests/): all six anchors in exactly 1 file. `ses-321-enhancement-fence` exits 0 on this tree today (board held by the AGT-480 claim → NOT RUN).

### 9.4 Sources opened

Ticket row (incl. the ruling's `scope_rationale`); `runner_decisions` 9b8fb462; `runner_items` b154c8eb; `pg_constraint`, `pg_proc`, `pg_trigger`, `supabase_migrations.schema_migrations`, `governance_rules`, `runner_model_lanes`; `docs/kickoffs/v7.0.853-AGT-480-victoria-placed-origin.md`; this harvest §1-8; `docs/kickoffs/v7.0.448-SES-368-weekly-pace-gate.md`; `tests/regression/agt-93-enhancement-filing-lane.test.mjs`; `tests/regression/_lib/self-run.js`; `scripts/verifier.js` (lane / model / anchor / baseline / attestation); `scripts/baseline-red-set.js`; `scripts/pre-build-baseline.js` (`declaredFiles`); the cycle's `pre-build-baseline-24c6550e.txt`; `docs/ARCHITECTURE.md` line 3 (AGT-480 amend); `git diff --stat origin/dev...HEAD`.
