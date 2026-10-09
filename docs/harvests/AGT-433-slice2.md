# AGT-433 — harvest, slice 2 (Designer, cycle 4bd8ccb5, v7.0.827, 2026-10-09)

Reasoning behind `docs/kickoffs/v7.0.827-AGT-433-validators-zero.md`. Not required reading for the build; every fact a task depends on is in the kickoff. Slice 1's harvest (cycle 7a6578ed, v7.0.826) stands above this section unchanged.

## 1. Premise revalidation (live, this cycle)

- Slice 1 holds: `backlog_items?need_score=eq.0` reads exactly AGT-383 and AGT-252 (REST, service key). The CHECK, the single overload and the md5 `87a58305d08b12b6eec33edc437dfb0e` were verified by the orchestrator at pick time and are not re-derived here.
- `scripts/requirement-check.js:202` (validateVerdict) and `:347` (validateListVerdict) both read `if (!Number.isInteger(score) || score < 1 || score > 5) {`; messages at :203 and :348 read `need_score must be a whole number 1-5; got ...`. Measured zero-network on the unchanged tree with the kickoff's PROBE: `0 false false`, `-1 false false`, `6 false false`, `2.5 false false`; 5 is accepted by both. So the third refuser directive `2458c24b` names is still closed: premise ALIVE.
- `runner_model_lanes`: orchestrator `claude-opus-5`, judgment `claude-fable-5-1`, mechanical `claude-sonnet-5`.
- AGT-433 row: status `partial`, claimed_by this cycle (`4bd8ccb5`), predicted_cycles 1.
- Tree: branch `session/cycle-20261009-0941` at `cac2e3d4` (v7.0.826 snapshot commit), clean.

## 2. Why three slices, not two — the cap decides, and the two sibling tests are forced

Changing the two validators turns two existing OFFLINE arms red, because both pin 0 as refused: `tests/regression/agt-280-requirement-check.test.mjs:198` (`must({ ...base, need_score: 0 }, "need_score 0")` matching `/1-5/`, plus :199 and the dry-run door pin at :245) and `tests/regression/agt-281-victoria-runs.test.mjs:255-257` (the loop `[0, 6, "4", 3.5, undefined]` matching `/1-5/`, plus the apply-list door pin at :292). Rehearsed this cycle on a working copy (restored with `git checkout`, nothing committed): after the two-line edit the PROBE prints `0 true true` and both tests exit 1 at `need_score 0: must be refused`. So the script plus those two files is the minimum change, and it is exactly the 3-file cap.

The gate test's inert cases — `tests/regression/agt-280-requirement-gate.test.mjs` case (vii) and cases 8-10, picked from `usable[0]` inside the gate at :158-172 — are a fourth file. Verified live this cycle: 4 epics of executing projects (`MCP Server and Access`, `Trainer-Authored Agents`, `Tooling`, `Dev Manager Capabilities`), every one `locked_at` non-null with `accepts_findings false`, so `usable.length` is 0 and arms A and B declare not-run; the suite run with credentials printed `[NOT RUN] AGT-280 arms A and B -- ... (executing epics past the AGT-240 lock: 0, backlog-intake epics: 1, market_records rows: 1)` and `[PASS]`. The backlog-intake epic that would carry them is `027fd54f-3739-458e-b4f7-c6752f9614b5` (`Intake — ZRST`, project `planned`). The fix is known (fixture epic from the intake epic, outside the `usable` gate; the `refusedScore` cases need that epic too) and it is one file — slice 3. The 3-file cap is John's to waive and the Designer never routes to John (JOHN-0925), so the split is the Designer's recorded call, the same shape as slice 1's §2. AGT-433 stays `partial` after this slice; it closes when (vii)/8-10 execute (pattern:95 — never discharge the ticket's own sentence under a new number).

Alternative not taken: folding the gate test in and leaving one sibling test red — a red suite blocks the ship, and a `--only` run that skips the red file would be a green manufactured by scope (pattern:162).

## 3. The baseline, and why it was taken with credentials stripped THIS time on purpose

Slice 1's baseline stripped credentials and reported a wholly not-run file as green — the mechanism of finding `23ee5294`. This slice's two files are different in kind: the arm being changed in each (arm A) is OFFLINE by design and runs identically with or without credentials, which the direct runs show (`[arm A validateVerdict and the --dry-run door] ok`, `[arm A the list validator and the two doors, zero network] ok`, both exit 0). Their credentialed arms (B in the check test, F-G in the victoria test) run the real `--apply` / `--apply-list` against the live board and write `runner_decisions`, `runner_before_images`, `audit_findings` and fixture `backlog_items` rows — writes the Designer may not make. So the Designer's baseline strips credentials and SAYS so in the kickoff, names which arms ran and which were declared, and the Builder re-runs with credentials before editing and reports every `[NOT RUN]` line. The gate test (not in this slice's file list) WAS run with credentials because at 0 usable epics it writes nothing: arm C ran, arms A/B declared not-run, as recorded above.

## 4. What is left alone on purpose

- `agt-281-victoria-runs.test.mjs:486` asserts the LIVE `vc-reorganize-intent.traits.schema` has `need_score.minimum = 1`. That row is Victoria's and directive `2458c24b` excludes it; finding `a1391267` (open, this ticket's slice 1) already names both rows. The assertion stays byte-identical so the test keeps telling the truth about the row until an attended session changes the row — then the pin changes with it.
- The `--dry-run` / `--apply-list` doors gain no 0 case. The ticket's sentence names the two validators; the doors call them and nothing else decides a score there (pattern:66).
- `docs/design/agt-280-requirement-gate.sql`, `agt-309-process-break-class.sql`: historical mirrors carrying the old `1-5` wording of functions slice 1 already replaced; a mirror is a record of what was applied, not a live file.

## 5. Anchors

Seven declared, all seven resolve at `cac2e3d4` (`node scripts/verifier.js --check-kickoff=...` -> `anchors graded (AGT-226): all 7 declared anchor(s) resolve in the tree`); kickoff 8,173 bytes, within 8,192, Lanes line present.
