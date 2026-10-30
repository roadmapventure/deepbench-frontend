# AGT-304 slice 42 -- harvest (P2 of the cap case: keyed and windowed board counts)

Cycle `9f438f1f-b9b9-44dc-877c-37b79315d023`, `v7.0.923`, tree `3a42e3f`, branch `session/cycle-20261030-1303`. Designer step with `cap_waived: 1a668f0d-00ad-4e76-8b44-bdd32ebb5952`. Not required reading for the build; every task fact is in the kickoff.

## 1. Premise revalidation (alive)

- The ruling `1a668f0d` (runner_decisions, status open, expires 2026-11-02T13:18Z) was read live over PostgREST at 13:19Z. It waives AGT-304 for ONE build scoped to P2: ses-364, ses-286a, ses-122a in that build order, keyed-versus-windowed per home as it states.
- The whole-table literals live in exactly the three P2 files on this tree: `git grep -F -l 'images: await countOf(url, key, "runner_before_images?select=id"),'` (excl. docs/kickoffs, docs/harvests) = 3 (ses-122a :342/:418, ses-286a :542/:573/:629/:692, ses-364 :527/:601); the `decisions:` form = 2 (ses-286a :628/:691, ses-364 :526/:600); `items:` and `agents:` whole-table forms = 1 each (ses-364 :528-529/:602-603).
- Write rate behind the lottery, live 13:22Z: 670 `runner_before_images` rows since 00:00Z; `runner_ladder` images today 6, `runner_verdicts` 6, `runner_settings` 2.
- The family is green by timing right now: baseline over the 4-file closure (ses-122a, ses-286a, ses-364, ses-399) at 13:23Z read `Red set: 0 of 4`; over the shipped 2-file closure (ses-286a, ses-364, ses-399) at 13:28Z `Red set: 0 of 3`. The ruling records ses-286a RED at 13:02Z on this same tree. So no red turns green; the tooth QA is the discriminator.

## 2. Every key and window, read live at 13:22Z (all `200 */0`)

| home | count | query | live |
|---|---|---|---|
| ses-364 | decisions | `runner_decisions?select=id&or=(id.eq.NIL,reverses.eq.NIL)` | 0 |
| ses-364 | images | `runner_before_images?select=id&or=(decision_id.eq.NIL,session_name.eq.ses-364 probe)` | 0 (space as `%20` and as a quoted value both 0; Node `fetch` with the raw space in the template literal also `200 */0`) |
| ses-364 | items | `runner_before_images?select=id&decision_id=eq.NIL&table_name=eq.runner_items` | 0 |
| ses-364 | agents | `runner_before_images?select=id&decision_id=eq.NIL&table_name=eq.agents` | 0 |
| ses-286a reverse arm | images | `runner_before_images?select=id&decision_id=eq.NIL` | 0 |
| ses-286a ladder arm | images | `runner_before_images?select=id&table_name=eq.runner_ladder&created_at=gte.t0` | 0 |
| ses-122a (dropped) | images | `runner_before_images?select=id&table_name=in.(runner_ladder,runner_verdicts,runner_settings)&created_at=gte.t0` | 0 |
| ses-122a (dropped) | stamped | `runner_verdicts?select=id&ladder_applied_at=gte.t0` | 0 |

The bare actor `probe` (`session_name=eq.probe`) owns 1 live image, as the ruling said, so it is in no key; `session_name=eq.ses-364 probe` owns 0. Client `t0` 13:22:46Z against the server `Date` header 13:22:50Z four requests later: no measurable skew.

ses-364's actors, from the file: `""` (:540, blank-actor guard), `"probe"` (:563, the misspelled-argument control, answered before any write), `"ses-364 probe"` (:574 blank reason, :584 unknown decision). Only the last could ever reach an image write, and only with `p_decision: NIL`, which is why the images key is `decision_id.eq.NIL OR session_name.eq.ses-364 probe` and the items/agents keys read NIL's images per table (a restore reaches those tables only through the decision's images -- P1's ses-320 shape).

ses-286a's probe (`theRpcReportsWrittenSinceRefusals`, :627-693) passes `p_decision` as the inline literal `"00000000-0000-0000-0000-000000000000"`; the file has no `const NIL`, so the ruling's `const NIL` lands directly below `const BLANK_ACTOR_GUARD` (:610). The probe line stays byte-identical.

## 3. Why the ladder arm is windowed, and what the window does not do

`ladder_work_class(p_priority_class)` takes only a class (PostgREST OpenAPI, verified by the ruling); `runner_ladder` carries `work_class, rung, streak, updated_at` and no attribution. No column the probe's own write would carry exists, so a key would be invented and the precondition would swear to a fiction. The honest form is a `t0` declared before `before`, images scoped to `runner_ladder` since `t0`. This is NOT elimination (pattern:1 not met, stated in the file): a peer promotion inside the ~1-2 s window still reds the arm. The trade accepted by the ruling: exposure narrows from every peer write (670 images today) to ladder moves (6 today), the same residual the arm already accepts in its six-row `ladder` snapshot. The two elimination routes (a read-only RPC over `pg_proc.provolatile`; retiring the purity arms) are outside a test-only part and forbidden by the ticket's own words respectively -- findings for the filing authority, not fixed and not filed here (pattern:96, pattern:132).

## 4. Byte-cap fallback, as the ruling pre-authorised

| draft | homes | bytes |
|---|---|---|
| 1 | ses-364 + ses-286a + ses-122a | 9,865 |
| 2 (prose trimmed) | same | 9,249 |
| 3 (prose trimmed again, 3 locator anchors dropped) | same | 8,902 |
| 4 (ses-122a dropped from the tail) | ses-364 + ses-286a | 9,030 (prose re-grown, overshoot) |
| 5 (shipped) | ses-364 + ses-286a | **8,112** against `KICKOFF_BYTE_CAP = 8192` (scripts/verifier.js:2164) |

Three prose-only passes could not clear 710 bytes without cutting a literal, a precondition, a tooth or a residual comment, so the ruling's fallback applied: drop from the tail, ses-122a first, never one arm of ses-286a. ses-122a stays AGT-304's residue and heads the next part before any P3 home; its design, measured and ready to lift, is in section 5.

## 5. ses-122a -- the designed task, dropped only by bytes (lift verbatim into the next part)

`tests/regression/ses-122a-verdict-ladder.test.mjs` (481 lines, 25 `assert.`; arm `theThresholdsAreColumnsAndTheRungIsRead`, `before` :340-344, `after` :416-420; `ladder:` lines untouched). WINDOWED, table-scoped. The SES-122a kickoff (`docs/kickoffs/v7.0.397-SES-122a-verdict-ladder.md`, "Read first" and gate term 3) names `runner_settings` as what `class_autonomy` reads (`auto_done_rung`, `cap_relax_rung`; the test's own header :4 and :27-28 say the same), so per the ruling it is ADDED to the `in.()`, never substituted; the kickoff also says "No runner_items reads for the new inputs", so `runner_items` is not added.

(a) both sites: `images` -> `` `runner_before_images?select=id&table_name=in.(runner_ladder,runner_verdicts,runner_settings)&created_at=gte.${t0}` ``; `stamped` -> `` `runner_verdicts?select=id&ladder_applied_at=gte.${t0}` ``.
(b) TWO lines above `  const before = {`:
```js
  // AGT-304 slice 42: images windowed to the tables class_autonomy reads or could stamp (runner_ladder, runner_verdicts, runner_settings -- SES-122a kickoff) since t0, stamps since t0. NOT elimination: a peer promotion or verdict stamp inside the ~1-2 s window still reds this arm, the same residual the six-row snapshot below already accepts.
  const t0 = new Date().toISOString();
```
(c) directly after the `  };` closing `before`:
```js
  assert.deepStrictEqual({ images: before.images, stamped: before.stamped }, { images: 0, stamped: 0 },
    `the window already owns board rows BEFORE the probe: images=${before.images} stamped=${before.stamped} since ${t0} -- the window is the key, and it owns none`);
```
Expected: `wc -l` 481 -> 485; `grep -c 'assert\.'` 25 -> 26; `grep -c 'countOf(url, key, "'` 4 -> 0; `grep -c 'moved the board'` 1 unchanged; tooth: `created_at=gte.${t0}` -> `created_at=lte.${t0}` at the `before` site reds `the window already owns board rows BEFORE the probe: images=<live>`. Anchor to carry: `tests/regression/ses-122a-verdict-ladder.test.mjs | 1 | stamped: await countOf(url, key, "runner_verdicts?select=id&ladder_applied_at=not.is.null"),`. Its related-set closure alone is itself (the 4-file closure above minus the two shipped homes and ses-399, which names ses-364).

## 6. Discriminator, as the ruling states it, for the shipped scope

Marker `AGT-304 slice 42` 0 -> 2 files; on the tree the images literal 3 -> 1 (ses-122a keeps it) and the decisions literal 2 -> 0; `assert.` +3 (ses-364 one, ses-286a two); one tooth per arm (keyed: `eq.${NIL}` -> `neq.${NIL}`; windowed: `gte.${t0}` -> `lte.${t0}`), each redding with its precondition's own `BEFORE the probe(s)` message, which the parent cannot emit; the `MOVED THE LEDGER` / `moved the board` asserts byte-identical; `probe` in no key (`grep -c 'eq.probe'` 0); `git diff origin/dev -- api/ src/ scripts/` empty. The 3-file baseline is reported beside, never as proof: the family is green by timing on both trees.

## 7. Sources opened this assembly

runner_decisions row `1a668f0d` (live); runner_model_lanes `orchestrator` row (live: `model_id = claude-opus-5`); the three P2 test files (full relevant ranges); `docs/kickoffs/v7.0.922-AGT-304-nil-keyed-ledger-pairs.md` (P1's shape and byte budget, 8,176 B); `tests/regression/ses-320-delivered-exit.test.mjs` :326-345 and :428-440 (P1's keyed form in situ); `docs/kickoffs/v7.0.397-SES-122a-verdict-ladder.md` (class_autonomy's read surface); `scripts/verifier.js` (KICKOFF_BYTE_CAP :2164, kickoffAnchorFinding :2428 with its `git grep -F -l` excluding docs/kickoffs and docs/harvests :3290, kickoffBuilderModelFinding :2329, baselineCoverageFinding :950); `scripts/related-tests.js` and `scripts/baseline-red-set.js` (run, not read); live PostgREST counts listed in section 2.

## 8. Unsure of

- Whether the verifier's anchor resolver also requires the anchored path itself to hold the literal (every anchor here does, so it is moot for this kickoff).
- The commit-message wording is mine (`v7.0.923 AGT-304 slice 42 - keyed and windowed board counts (P2)`), mirroring P1's form; the ruling names none.

Patterns leaned on: 162, 65, 68, 120, 85, 172, 132, 96, 9, 1, 168.
