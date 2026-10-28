# AGT-304 -- harvest, slice 33 (v7.0.914, cycle 09028d7d, 2026-10-28)

## 1. Premise (alive), measured this cycle on tree 8e1f897
- `scripts/baseline-red-set.js` over the related set of `tests/regression/agt-482-claim-stop-fence.test.mjs` (the subject plus its named sibling `agt-455-drain-score-exemption`): `Red set: 1 of 2`, the red being `[FAIL] agt-482-claim-stop-fence.test.mjs -- pick_exclusions() returned no row at all for AGT-020`. Block written by `scripts/pre-build-baseline.js` at 2026-10-28T16:27:47.494Z and copied verbatim (basenames) into CONTEXT.
- Live, over PostgREST, service key: `POST rpc/pick_exclusions` with `Prefer: count=exact` and no filter -> `content-range: 0-999/1427`, body 1,000 rows. The function has no ORDER BY, so the 1,000 that come back is whatever the scan yields: one probe (the count=exact one) held all three stopped ids; three plain probes each held `AGT-159` and neither `AGT-020` nor `PRO-3` (first row `SES-304`, last `AGT-301` on all three) -- the exact shape of the suite's failure. The Development Manager's own measurement before this cycle agreed (`Content-Range: 0-999/1427`, AGT-020 and PRO-3 absent).
- The fence itself: `POST rpc/pick_exclusions?id=in.(ce0137f0-...,98c05dab-...,ce6e0c84-...)&select=id,backlog_id,reasons` -> 3 rows, `content-range: 0-2/*`, every one carrying `stopped by John (STOPPED-BY-JOHN-2026-09-29); only John releases this claim` (PRO-3 also `need_score 2 is below 3`, AGT-020/AGT-159/PRO-3 also `project not executing (planned)`). The stop reason is present; the transport dropped the rows.
- Live stopped population (`backlog_items?claimed_by=like.STOPPED-BY-JOHN*`): AGT-020, AGT-159, PRO-3, all `STOPPED-BY-JOHN-2026-09-29`, 29 days old.
- Every other arm green on this tree (manager-verified, re-confirmed by the experiment below): A, B, D (countable_claim_hours 6, claim_stale_hours 24, backlog_mode "in development"), E pure and live (the claim query refuses AGT-020; the age-only control matches it).

## 2. The experiment (design tree, reverted; `git status --short` empty after)
- Edit (a) applied with placeholder comment lines plus a header line: `wc -l` 237, `grep -c 'assert\.'` 27, `grep -c 'pick_exclusions?id=in.('` 1, `grep -c 'rpc("pick_exclusions")'` 0.
- `baseline-red-set.js --tests=<subject>` -> `Red set: 0 of 1`; direct run printed `AGT-482 arm C, recomputed this run: 3 stopped row(s) fenced -- AGT-020, AGT-159, PRO-3` and `AGT-482 arm E, live: the claim query refuses AGT-020 ...`; `[PASS]`.
- Tooth (i): `id=in.(00000000-0000-0000-0000-000000000000)` -> RED `pick_exclusions() returned no row at all for AGT-020`.
- Tooth (ii): `/^never$/` for `STOP_SENTENCE` at built line 165 -> RED `3 of 3 STOPPED-BY-JOHN row(s) carry NO stop reason in pick_exclusions(): AGT-020 {project not executing (planned), stopped by John (...)} | ...`. The check still grades the reason, not the transport.

## 3. Why a named-id filter, and why not the alternatives
- A filter on the ids arm C already read is independent of the function's row count (pattern:1): it holds at 1,427 and at 14,270 rows. It is the form `agt-455` already uses at lines 136 (`?id=in.(...)`) and 187 (`?id=eq.`), and the form `agt-490`/`agt-309` use (`?backlog_id=eq.`) (pattern:17).
- NOT a `Range`/`limit` or paging loop: that keeps reading 1,427 rows to use 3, and `readAll()`-style paging on an rpc with no ORDER BY is unstable by construction.
- NOT widening the `rpc` helper to a `(fn, body, query)` signature: `const rpc = async (fn, body = {}) => {` is a line shared by five suites (agt-456, agt-481, agt-482, agt-483, agt-485), so it cannot be an anchor that resolves to one file, and the helper's `fn` is already interpolated as the URL tail -- the query string rides on it with no helper change (pattern:65).
- NOT a `.filter(...)` over the capped reply, and NOT `notRun` when the ids are missing: both would hide the fence behind the transport -- loosening, which John's ruling forbids (pattern:166).
- No assertion text, count or direction changes. `grep -c 'assert\.'` 27 -> 27.

## 4. Discovery, not fixed here
- `tests/regression/agt-173-card-citations.test.mjs:736` -- `const core = await rpc(url, key, "pick_exclusions", {});` -- also reads the function unfiltered and builds `reasonsOf` from it, then asserts `pick_exclusions() returned no row for <ticket>` over every open/partial ticket of an executing project. Same 1,000-row exposure. Measured this cycle: RED on an earlier, different first cause (`card 7c55bf10 now cites a removed ticket (AGT-141)`). Its own slice; named in the STOP LINE. Not pulled into this kickoff's related set on purpose (path never written in backticks or bare), so the builder is not graded on it.
- `pick_exclusions()` itself: no ORDER BY, so any unfiltered reader sees a different 1,000 per call. Adding ORDER BY would not cure a 1,427-row function against a 1,000-row reply; the readers must name ids. No DDL proposed.

## 5. What was NOT done
- No `scripts/` edit, no Supabase write, no DDL, no `capture_migration_down`. No change to `run-project.js` constants (CLAIM_TTL_HOURS 6, STOP_CLAIM_PREFIX). No `run-all.js` run (one global slot).

## 6. Sources opened
Ticket row (task_context); kickoffs v7.0.906-v7.0.913 (slices 25-32; 906/907 carry `agt-482` as "its own slice"; 856 is the original AGT-482 kickoff); `docs/harvests/AGT-304-slice32.md` (shape); subject test lines 1-232; sibling lines 105-200; `scripts/pre-build-baseline.js` (`declaredFiles`: anchors + backticked paths + bare tests/regression paths), `scripts/verifier.js` (anchor block parse, `KICKOFF_BYTE_CAP`), `scripts/related-tests.js --files=` (each file maps to itself only); live `runner_model_lanes` (orchestrator `claude-opus-5`, judgment `claude-fable-5-1`, mechanical `claude-sonnet-5`); live PostgREST probes above.
