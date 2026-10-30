# AGT-304 slice 44 -- harvest (P3: agt-79's two probe arms stop counting whole tables)

Cycle `102235f9-e920-4746-9297-a5aa476b6add`, `v7.0.926`, tree `d514804`, branch `session/cycle-20261030-1446`. No `cap_waived` and none needed: 1 file / 2 tasks against caps 3/4. Not required reading for the build; every task fact is in the kickoff.

## 1. Which slice this is, and why it is not a restart

Slice 43 shipped at `v7.0.925` (commit `47c7e0f`, `docs/kickoffs/v7.0.925-AGT-304-windowed-ladder-keyed-decisions.md`) and closed `ses-122a-verdict-ladder` (P2 tail) and `agt-150-model-assignment` (P3 head, clearing `agt-151-build-trial` by consequence). Its STOP LINE names the remainder: `agt-280` and `agt-79`, "deferred by byte budget, not judgment". This slice takes `agt-79`, whole. `git grep -F -l 'AGT-304 slice 43'` names only `ses-122a` and `agt-150`, so nothing shipped is being re-designed.

The nine lottery homes, from `docs/harvests/AGT-304-slice41.md` :43 and rulings `6c853930` / `1a668f0d` read live this turn: P1 `ses-399`, `ses-315`, `ses-320`; P2 `ses-286a`, `ses-364`, `ses-122a`; P3 `agt-280`, `agt-79`, `agt-150`.

**An ambiguity in the record I could not resolve, and did not paper over.** "agt-280" names ONE home in that enumeration, but the tracked tree holds TWO files that carry the family's shape -- `tests/regression/agt-280-requirement-check.test.mjs` (5 `count(url, key, "<table>?select=id")` sites) and `tests/regression/agt-280-requirement-gate.test.mjs` (4). Neither appears in ruling `8b27def7`'s 13-suite list, which was measured over `runner_decisions` / `runner_before_images` only, and the slice-40 cap case that enumerated the 25 homes is not reachable on this clone (`git show 6626569:...` -> `fatal: invalid object name`). So the STOP LINE names both files as the ninth home rather than guessing, and they go next together.

## 2. Premise revalidation (alive), measured this cycle

- **The standing red is current and is this ticket's own subject.** `ci_run_conclusions` for `ref=dev`, six newest rows (live 15:00Z): every one carries `Build (blocking)=success` + `Tripwire + regression (blocking)=failure`, including this clone's own parent `d514804` at **2026-10-30T14:58:58Z** and slice 43's push `47c7e0f` at 14:49:26Z. The ticket's "38 suites" figure is from the 2026-09-30 tree and was deliberately NOT re-derived; this slice grades its own named set.
- **The two arms still count whole tables, unkeyed and unwindowed, on this tree.** `tests/regression/agt-79-ticket-owner.test.mjs`: `restCount(base, key, table)` at :246-256 builds `${table}?select=id` with no filter at all. The census negative reads `ticket_owner_findings` (:1302) and `backlog_items` (:1303) and re-asserts both at :1402 / :1404; part K reads `WRITE_TABLES = ["runner_cycles", "runner_decisions", "ticket_owner_findings", "runner_before_images"]` at :1411 and re-asserts all four at :1439. Six whole-table counts, zero scoping.
- **Both arms actually execute live.** A direct run at 14:53:05-14:53:17Z printed `[AGT-79] part K live: gate answered 3`, `part G: decision 7b41052f-...`, `part O: ZZTO-795 refused -> proposed 1`, and `[PASS]`. Neither lottery arm is a dark `[NOT RUN]`.
- **Exposure, live 14:53-14:57Z.** Whole-table: `runner_cycles` 2,007, `runner_decisions` 11,637, `ticket_owner_findings` 642, `runner_before_images` 32,238, `backlog_items` 1,427, `audit_findings` 2,413. Written **today**: `runner_cycles` 32, `runner_decisions` 549, `ticket_owner_findings` **1**, `runner_before_images` 874, `backlog_items` **0**, `audit_findings` 19. So part K's four counts carry 1,456 peer writes a day between them -- the largest single lottery left in the family -- and the census arm's two carry 1.

## 3. Red/green readings -- four of them, and no flip seen

`scripts/baseline-red-set.js`, credentialed, nothing edited between runs:

| # | time (UTC) | set | result |
|---|---|---|---|
| 1 | 14:52:35 -> 14:52:57 | agt-79, agt-280-gate, agt-280-check | `Red set: 0 of 3` |
| 2 | 14:56:56 -> 14:57:16 | same 3 | `Red set: 0 of 3` |
| 3 | 15:01:38 -> 15:02:00 | agt-79, agt-280-check | `Red set: 0 of 2` |
| 4 | 15:05:39 -> 15:05:52 | agt-79 (the shipped set) | `Red set: 0 of 1` |

Reading 4 is the kickoff's BASELINE block, measured over exactly the related-set closure the gate will grade (`scripts/related-tests.js --files=<the one file>` -> `{"count":1}`), so `baselineCoverageFinding()` cannot call it narrow. **No flip was observed this cycle**, unlike slice 43's `agt-150` (RED 14:17Z, green 14:22Z). That is a timing fact, not evidence the lottery is gone: the arms are unkeyed, 1,456 peer writes land a day, and the probe windows are seconds wide. It does mean no red turns green here, so QA 1's teeth are the only discriminator.

## 4. Every key and window, read live at 14:53-14:55Z

| arm | count | query | live |
|---|---|---|---|
| part K | cycles | `runner_cycles?select=id&id=eq.${ZERO}` | `200 */0` |
| part K | decisions | `runner_decisions?select=id&cycle_id=eq.${ZERO}` | `200 */0` |
| part K | findings | `ticket_owner_findings?select=id&cycle_id=eq.${ZERO}` | `200 */0` |
| part K | images | `runner_before_images?select=id&cycle_id=eq.${ZERO}` | `200 */0` |
| census | findings | `ticket_owner_findings?select=id&first_seen_at=gte.${t0}` | `200 */0` |
| census | items | `backlog_items?select=id&created_at=gte.${t0}` | `200 */0` |

`ZERO` is `00000000-0000-4000-8000-000000000000`, declared at :947 inside `main()` (which opens at :258), so it is in scope at :1411.

**Two environment facts found live, either of which would have broken a kickoff written from memory:**

1. **`ticket_owner_findings` has no `created_at`.** Its columns, read live: `id, backlog_id, check_slug, verdict, detail, first_seen_at, last_seen_at, cleared_at, cycle_id`. A `created_at=gte.` filter returns **HTTP 400**. The window must use `first_seen_at`. (`backlog_items` does have `created_at`.) This is the same class of trap slice 43 hit on `runner_decisions` (no `created_at`; `decided_at`).
2. **`restCount` cannot take a filter as written.** :247 builds `${table}?select=id`, so handing it `"runner_decisions?cycle_id=..."` would emit two `?` and 400. Hence (a): an optional fourth parameter appended after `select=id`, which leaves the signature backward-compatible and every unedited call site byte-identical. The exact assembled URLs were proven live before the task was written.

## 5. Why part K is elimination and the census arm is not

Part K spawns `ticket-owner.js --judge --cycle-id=${ZERO}` and asserts pass one writes nothing. Every write that pass could make is attributed to the cycle it was handed, so `id=eq.ZERO` / `cycle_id=eq.ZERO` is the probe's own key by construction, and `ZERO` is not a cycle any live runner uses (0 rows in `runner_cycles`). A peer write cannot reach these four counts at all. That satisfies pattern:1 outright -- a removed exposure, not a narrowed one.

The census arm cannot reach that. `--census --out=... --json` carries no cycle id and no actor, and `ticket_owner_findings` has no column a census write would fill with anything identifying. Per ruling `1a668f0d`'s own rule ("never an invented key the precondition then swears to"), the honest form is a `t0` read before the `before` counts and a window bounded to the two tables the binary could write. **What makes the window honest rather than blind here:** `scripts/ticket-owner.js` contains **zero** occurrences of the string `DELETE` (`grep -c DELETE` = 0) -- POST and PATCH only -- so an insert is the only write shape it has, and a created-since window sees every one of them. That is the difference from slice 43's `agt-150`, where the probe's one write door was an UPDATE and a window would have been blind to it, which is why those two counts were left whole-table there. The residual is still stated in the inserted comment, in those words: a peer insert inside the window still reds this arm. Exposure falls from 1 `ticket_owner_findings` write a day plus every `backlog_items` insert to only those landing inside a seconds-wide window.

## 6. The scope decision -- why ONE file, measured not asserted

The caps (3 files / 4 tasks) do **not** force a split here, so per my guardrail I write a kickoff and not a cap case. The binder was the 8,192-byte kickoff cap (`KICKOFF_BYTE_CAP`, `scripts/verifier.js`), and I measured rather than guessed:

| draft | homes | bytes |
|---|---|---|
| 1 | agt-79 + agt-280-check + agt-280-gate | **12,013** |
| 2 | agt-79 + agt-280-check | 10,740 |
| 3 | same two, prose trimmed | 10,204 |
| 4 | same two, trimmed again | **9,892** |
| 5 | agt-79 alone | 8,770 |
| 6 | agt-79 alone, trimmed | 8,396 |
| 7 (shipped) | agt-79 alone | **8,168**, `node scripts/verifier.js --check-kickoff` exit 0, no findings |

Three homes are a 12,013-byte kickoff: not reachable by trimming prose, and I would not cut a path, a from-string, a command or a QA number to fit (SES-376). Two homes measured 9,892 after two trimming passes. So the tail-drop applied, in the shape rulings `6c853930` and `1a668f0d` pre-authorised for exactly this: drop homes whole, never half a file.

**Why `agt-79` is the home kept, on measurement.** Its six counts carry 1,456 peer writes a day. `agt-280-requirement-check`'s whole-table `audit_findings` count carries 19, its `backlog_items` count 0. `agt-280-requirement-gate` counts only `backlog_items` (0 peer inserts today) and **two of its four sites are dark**: a live run printed `[NOT RUN] AGT-280 arms A and B -- ... (executing epics past the AGT-240 lock: 0, backlog-intake epics: 1, market_records rows: 1)`, so only arm D's pair executes. Keeping `agt-79` removes ~98.7% of the measured exposure in the three files.

**Why not half of `agt-79`.** Dropping the census arm would have saved roughly 1,250 bytes and let a second home in, but ruling `1a668f0d` is explicit that a file ships both arms or neither -- "a half-fixed file is not a part" -- so the file goes whole and the other home waits.

## 7. The next part, already measured and ready to lift

Both `agt-280` files, together, 2 files / 3 tasks -- measured at about 2,750 bytes of task text, which fits a two-home kickoff:

- **`agt-280-requirement-check.test.mjs`** (585 lines, 87 `assert.`; arm B runs live -- `requirement-check decisions 5995 -> 5996 -> 5995, findings 2413 -> 2413`). Six lines above :316: `const findingsQ = \`audit_findings?select=id&fingerprint=eq.${FP}&created_at=gte.${t0}\`;` and `const fixtureQ = \`backlog_items?select=id&backlog_id=in.(${T_PASS},${T_NN})\`;`. Then :316, :468 and :558 read `findingsQ`; :338 and :472 read `fixtureQ`; :468's expected value becomes `repeat ? 0 : 1` (the `findingsBefore + ` term goes, because the window starts at 0). `FP` = `agt-280:not-needed:41448a63ce5236cab77ab213ea7f879a13c3c0f4bc01f1c465a571e0b95eef25`, which owns exactly **5** live rows (one per ISO week, append-only, AGT-70) -- hence the `t0` window, the same move slice 43 made for `agt-150`'s historical 4. `repeat` is `fpIds.has(findingId)` (:456), already fingerprint-derived, so the keyed form matches the arm's own logic. Both `count` helpers in the `agt-280` files take a whole query string, so neither needs a signature change.
- **`agt-280-requirement-gate.test.mjs`** (423 lines, 44 `assert.`; `FIXTURE_PREFIX = "ZAGT280"` :65, which owns **0** live rows). All four sites (:230, :276, :339, :365) become `` `backlog_items?select=id&backlog_id=like.${FIXTURE_PREFIX}-*` `` -- elimination; a precondition `before === 0` after :230 and :339. **The tooth must be taken on arm D**, since arms A/B are `[NOT RUN]` live.
- **A trap for that slice:** `tests/regression/agt-309-process-break-class.test.mjs:413` holds `      const before = await count(url, key, "backlog_items?select=id");` **byte-identically**, so that anchor resolves to 2 tracked files and a tree-wide replace would touch a different home. `agt-309` is P4+ residue (it is in ruling `8b27def7`'s 13-suite list) and must be left alone.

## 8. Reported, not fixed, not filed (pattern:96, pattern:132)

- `agt-280-requirement-check`'s `decisionsQ` is `runner_decisions?select=id&kind=eq.requirement-check` -- already key-scoped, so outside this part's whole-table family, but **81 rows of that kind were written today**, so it is a live lottery of its own at :315 / :377 / :547. Named for the filing authority.
- The slice-43 kickoff links `docs/harvests/AGT-304-slice43.md` and that file does not exist on this tree (harvests run slice30-42 plus `AGT-304.md`). Its reasoning survives in the cycle's answer JSON only. A record gap, not this slice's work.
- `ses-297` and `agt-291` stay untouched (John, 2026-10-26).

## 9. Sources opened this assembly, and the fact each gave

- `docs/kickoffs/v7.0.925-AGT-304-windowed-ladder-keyed-decisions.md` -- slice 43's shipped scope, its STOP LINE naming `agt-280`/`agt-79`, and the 8,167-byte precedent for the section shape.
- `docs/kickoffs/v7.0.923-AGT-304-keyed-windowed-board-counts.md` and `docs/harvests/AGT-304-slice42.md` §§1-5 -- the keyed/windowed task shape, the byte-cap fallback table, the tail-drop rule.
- `docs/harvests/AGT-304-slice41.md` §6 -- the nine lotteries and the P1/P2/P3 build order.
- `runner_decisions` rows `1a668f0d`, `6c853930`, `8b27def7`, `bc9091dd` read live in full -- the waive scope, the keyed-vs-windowed rule, "a half-fixed file is not a part", the pre-authorised byte-cap tail-drop, and the 13-suite list that does NOT contain either `agt-280` file.
- `tests/regression/agt-79-ticket-owner.test.mjs` :238-262, :940-950, :1255-1320, :1390-1450 -- `restCount`, `countWhere`, `ZERO`'s scope, both arms' exact `before`/`after` sites and messages.
- `tests/regression/agt-280-requirement-check.test.mjs` :60-100, :300-345, :450-475, :540-560 and `agt-280-requirement-gate.test.mjs` :60-100, :150-180, :215-285, :325-370 -- §7's measured next slice.
- `tests/regression/agt-309-process-break-class.test.mjs` :413 -- the duplicate anchor line (§7's trap).
- `scripts/ticket-owner.js` -- write doors: POST/PATCH only, `DELETE` count 0.
- `scripts/related-tests.js`, `scripts/baseline-red-set.js`, `scripts/verifier.js --check-kickoff` -- run, not read.
- Live over PostgREST, read-only with the service key: `runner_model_lanes` (all three rows; `orchestrator` = `claude-opus-5`, which is the Model: line), `ci_run_conclusions` (six newest `dev` rows), the column lists of `ticket_owner_findings` and `runner_cycles`, and every count in §2 and §4. Direct runs of all three test files.

## 10. Unsure of

- **Whether pass one has ever had a write path at all.** Part K's precondition guards an attribution the probe has never exercised live (`gate answered 3` is the assemble-and-exit-3 branch). That is why tooth (i) -- flipping `eq.` to `neq.` and reading the whole-table numbers back -- is what proves the assertion has teeth, not an observed write.
- **Whether the census could ever delete.** I proved `scripts/ticket-owner.js` holds no `DELETE` string, which covers the REST path; I did not audit every RPC it calls for a server-side delete. If one existed, the window would be blind to it where the old whole-table count was not. The comment states the window's limits, and the arm's own wording ("must not write, touch or clear") is left byte-identical.
- **Which `agt-280` file the nine-home enumeration counted** (§1). Both are named rather than assumed, so the count reads "8 of 9" on the conservative reading.
- The commit message wording is mine, mirroring slices 41-43; no ruling names one.

Patterns leaned on: 162, 1, 3, 9, 65, 68, 85, 96, 132, 164, 168.
