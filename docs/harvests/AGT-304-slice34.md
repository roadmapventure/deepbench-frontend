# AGT-304 -- harvest, slice 34 (v7.0.915, cycle fc613ca7, 2026-10-30)

Not required reading for the build. §3 is a designed, proven fix that did NOT ship here and needs a Development Manager ruling first; §2 is the slice-35 candidate list.

## 1. Premise (alive), measured this cycle on the unchanged clone of `origin/dev` (`94b8b82`)

- The cycle's full `node tests/regression/run-all.js`: `423/441 suites passed`, **18 `[FAIL]` lines** (the ticket's text says 38; slices 1-33 cleared 20). 206 parts declared not-run across 133 tests are UNVERIFIED, not reds. CI's own grade for `94b8b82` (run 40731693405): Build (blocking) = success, Tripwire + regression (blocking) = failure -- the standing red is real and current, and the step-7a bar still cannot tell a new red from the standing set.
- `scripts/baseline-red-set.js --tests=tests/regression/agt-173-card-citations.test.mjs` on the unchanged clone, credentialed, 2026-10-30T07:12Z: `Red set: 1 of 1`, the red being `card 7c55bf10 now cites a removed ticket (AGT-141) — that is a real finding about the board, not a bug in this guard`. `scripts/related-tests.js` over the file: `{"count":1}` -- the test is related only to itself, so the BASELINE block over one file is the whole related set.
- Live, PostgREST, service key, read-only: `backlog_items` AGT-141 `removed`, AGT-178 and AGT-200 `removed` (card 0b6b9048's citations -- a second hit behind the first); `POST rpc/pick_exclusions` with `Prefer: count=exact`, no filter -> `content-range: 0-999/1427`; executing projects 2 (`dev-manager-capabilities`, `tooling`), epics 4, open/partial tickets in them 27 (arm I's graded population); `runner_model_lanes` orchestrator `claude-opus-5`, judgment `claude-fable-5-1`, mechanical `claude-sonnet-5`; AGT-271 (the ticket's named home for contended arms) `removal proposed`; AGT-304 `partial`, claimed by this cycle at 06:52:46Z.

## 2. The 18 reds, triaged into the ticket's three buckets

**Out of scope by the 2026-10-26 gate ruling (carried as every slice since 21 has):** `agt-291-finish-sensor` and `agt-184-ledger-orphan` (the Supabase connector's 60 s write ceiling, AGT-495 / AGT-465); `ses-320b-window-finaliser` and `agt-245-regrade-delivered` (`sweep_decision_windows` wedged on AGT-281, check_slug `window-finaliser-wedged-by-one-ticket`); `ses-297-pre-boot-pickability`, `agt-314-find-work-boot`, `SES-352-green-anchor-from-ci`.

**Cleared this slice (bucket: subject retired + landed-change exposure):** `agt-173-card-citations` -- two causes, see the kickoff.

**Bucket: grades contended live state (AGT-271 is `removal proposed`, so this ticket's own):** `ses-399-attach-fails-closed` -- designed and proven in §3, over the cap, not shipped.

**Bucket: a real behaviour or board finding -- its own slice or a ruling, never a test edit:**
- `agt-448-cap-split-guard` arm C -- `AGT-433` is an unruled split since the 2026-10-09 cutoff. A Development Manager ruling to record (pattern:172), not a pin.
- `ses-424g-blocker-cleared` -- epic `1af331b4` belongs to a paused project; needs a board write plus the AGT-156 -> AGT-155 ruling.
- `ses-424h-johns-three-carried` -- (A i) wants exactly 1 UNDECIDED card carrying "judged-lane" and gets 0: the cards were decided and AGT-220 / AGT-564 re-file the items. Two causes.
- `ses-415-role-tagged-criteria` -- criterion 170's passage is not in `backlog_items.SES-382.defer_reason` (overwritten 2026-09-18 with no before-image). A content correction at the source.
- `agt-70-auditor` -- the test's `fingerprint()` mirror and `scripts/audit-ledger.js` disagree (ledger says 3 new / 2 seen / 4 rec+ruled; script prints 0 new / 4 seen / 1 recurring / 1 ruled-out). Behaviour.
- `agt-84-personal-agent` -- `write_backs went 0 -> 0, expected +1`: a live write path not writing. Behaviour.
- `agt-86b-audit-review` arm E and `agt-132-finding-routes` arm G -- the same root: `prepare`'s worklist omits open/carried findings whose `found_by` is joined (27 of them). A function question. agt-132 also reds on C (a live finding to route), D (`agent-prompt` exits null with `--intent omitted`) and H (`dm-guardrails.guardrails.must` 8 not 5 -- the one pin among four arms; clearing it alone clears no red).
- `agt-267-careers-page-fetch` -- 9 of 19 watch companies carry no `json_url` and no `search_only_reason`: data to measure and give the rows.

## 3. `ses-399-attach-fails-closed` -- designed, proven, NOT shipped: six homes against a cap of three

**The defect.** Arm 5 of `theDeployedVocabularyAndTheGuardPathAreReal()` reads `countOf("runner_before_images?select=id")` and `countOf("runner_decisions?select=id")` before and after three refusal probes and asserts `after` deep-equals `before`. In the full run it read before `{"images":31428,"decisions":11128}`, after `{"images":31430,"decisions":11130}`. Neither delta can be the probes': `attach_before_images()` never inserts a `runner_decisions` row, and its only write is an UPDATE of `decision_id`, which never changes a row count -- so the assertion was blind to the write it names and sensitive to every other writer. Between 06:40Z and 07:10Z this cycle alone wrote 44 decisions and 70 before-images (newest at 07:03:34Z, `kind` `removal-proposal`, `cycle_id` fc613ca7). Run alone, `baseline-red-set.js` read the suite green 3 of 3 (07:09:16-18Z): a flake, red whenever a write lands in the ~1 s probe window. The rows the probes COULD write carry `decision_id` = NIL (`00000000-0000-0000-0000-000000000000`); live, `runner_before_images?decision_id=eq.<NIL>` -> `*/0` and `runner_decisions?id=eq.<NIL>` -> `*/0`.

**The fix, proven on a copy of the tree (never the clone), `[PASS]`, 457 -> 466 lines, `assert.` 31 -> 32:**
- Lines 343-344 AND 395-396 (`before` and `after`, identical pairs): `images: await countOf(url, key, "runner_before_images?select=id"),` -> ``images: await countOf(url, key, `runner_before_images?select=id&decision_id=eq.${NIL}`),`` and `decisions: await countOf(url, key, "runner_decisions?select=id"),` -> ``decisions: await countOf(url, key, `runner_decisions?select=id&id=eq.${NIL}`),``.
- After line 345 (`  };` closing `before`): a precondition assertion `assert.deepStrictEqual(before, { images: 0, decisions: 0 }, ...)` -- NIL must own no decision and no image before the probes, which is what makes clause 2's refusal the write-free path.
- Line 393 comment: `//    neither table may have moved by a single row.` -> `//    neither scoped read may have moved: no image attached to NIL, no NIL decision (AGT-304 slice 34).`; a `// DeepBench v7.0.915 | ...` header as new line 1.
- The `assert.deepStrictEqual(after, before, ...)` call and its `MOVED THE LEDGER` message stay byte-for-byte.
- Teeth, both bit: `after`'s `decision_id=eq.${NIL}` -> `decision_id=not.is.null` -> red `the guard-path probes MOVED THE LEDGER`; `before`'s `id=eq.${NIL}` -> `id=neq.${NIL}` -> red `decision 00000000-... owns a runner_decisions row or an attached image BEFORE the probes`.

**Why it did not ship here.** `git grep -F -l` for the `images: await countOf(url, key, "runner_before_images?select=id"),` line resolves to **6** tracked files and the `decisions:` line to **5**: ses-122a-verdict-ladder, ses-286a-reversal-window, ses-315-ship-reverse, ses-320-delivered-exit, ses-364-reverse-agent-rows and ses-399. Each sibling is green today by timing and flaky by the same construction. One defect in six homes is one ship (pattern:163), six files is over the 3-file cap, and a one-home slice would leave five flakes standing -- so the case goes to the Development Manager (pattern:172), with this section as the design. A two-file kickoff (agt-173 + ses-399) was drafted first and measured 11,274 then 10,264 bytes against the 8,192 cap with every task fact intact; the cap, not the scope, dropped ses-399 from this slice.

## 4. Alternatives rejected for agt-173

- Arm B: editing the frozen fixture to drop AGT-141 falsifies a verbatim card; asserting only "removed before the card closed" needs a removal timestamp the board does not carry; restoring AGT-141 asserts a product fact on a regression test's authority. Reporting keeps the guard (function agrees with the board) and renders the absence honestly (pattern:34, pattern:162).
- Arm I: `limit=`/`Range` or a paging loop keeps reading 1,427 rows to use 27 and is unstable without ORDER BY; `.filter()` over the capped reply or `notRun` on missing ids hides the core behind the transport (pattern:166). The named-id filter holds at 1,427 rows and at 14,270 (pattern:1), and the `rpc` helper is unchanged -- its `name` is already the URL tail.

## 5. Scope and the cap

1 file / 3 tasks against caps of 3 / 4; no split, no waiver, no `pattern:172` case for THIS slice. The binding constraint was the 8,192-byte kickoff cap (final 8,151 bytes UTF-8); `kickoffLaneFinding` null, `kickoffBuilderModelFinding("claude-opus-5")` null, `declaredFiles` = the one test, anchors 3 of 3 resolving each to exactly 1 tracked file (`git grep -F -l`, excluding docs/kickoffs/ and docs/harvests/).

## 6. Proof log (copy of the tree in the session scratchpad; the clone's `git status --short` empty throughout)

Edit (a) alone -> red `pick_exclusions() returned no row for AGT-291` (the hidden second cause). Both edits -> `[PASS]`, printing the two `[AGT-173 arm B]` report lines; `wc -l` 812, `assert.` 104, `disagrees with backlog_items` 1, `rpc(url, key, "pick_exclusions", {})` 0, `pick_exclusions?id=in.(` 1, `now cites a removed ticket` 0. Tooth (i) NIL id filter -> red `pick_exclusions() returned no row for AGT-478`; tooth (ii) `[]` for `expected` in the agreement assert -> red `card 7c55bf10 disagrees with backlog_items about which of AGT-141, AGT-132, AGT-138, AGT-131, AGT-129, AGT-140 is removed`. Restored -> `[PASS]`.

## 7. Sources opened

The assembled Designer prompt (ticket row, caps 3/4, version v7.0.915, cycle id); the cycle's full-suite log (18 `[FAIL]` lines with their arm detail); `docs/harvests/AGT-304.md` §4 and `docs/harvests/AGT-304-slice33.md`; kickoffs v7.0.901-v7.0.914 (the gate-ruling carry list and the shape); `tests/regression/agt-173-card-citations.test.mjs` lines 95-130, 447-530, 640-660, 699-800; `tests/regression/ses-399-attach-fails-closed.test.mjs` in full; `scripts/baseline-red-set.js`, `scripts/related-tests.js`, `scripts/pre-build-baseline.js` (`declaredFiles`, `BACKTICKED_PATH`, `BARE_TEST`), `scripts/verifier.js` (`KICKOFF_BYTE_CAP`, `anchorBlockLines`, `kickoffLaneFinding`, `kickoffBuilderModelFinding`); `docs/STANDARDS.md` 230-242; `docs/ARCHITECTURE.md` §19v header; live PostgREST reads named in §1 and §3.
