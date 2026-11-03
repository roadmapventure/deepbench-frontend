-- DeepBench v7.0.939 | docs/design/agt-566-recheck-sweep.sql | AGT-566 — T1, the recheck sweep: the
-- TEN non-retired `public.market_records` rows that still carry one of the three wrong strings
-- `AGT-470` found, each put through `public.apply_claim_recheck(uuid, text, jsonb)` with
-- `p_cycle` = this cycle and `p_session` NULL. Sectioned like `docs/design/agt-470-corrections.sql`.
--
-- PREMISE, RE-MEASURED ON THIS TREE BEFORE THE FIRST CALL (never recalled):
--   * all ten rows live, `status` <> `retired`, `data->'recheck'` NULL on every one of them.
--   * the §2 render (`node scripts/market-agent.js --render --agent=nathan
--     --capability=pmm-competitors --json`) loads `records_loaded` 69 and holds each of the three
--     strings EXACTLY TWICE — not the ticket's 40 / 3 / 3, which was a whole-BODY render count that
--     `AGT-550` retired: since `AGT-550` a record renders as `recordHead()` (id, kind, title, date
--     and a 240-character head), never its body and never its `data`.
--   * where each pair of hits actually sits, proven per row by title / head / body probe:
--       `Grok Bot for Enterprise` — the TITLES of `fe667377` and `22215386` (C1, C2). Also in the
--         BODY of `63aa1ad2` (H1), past character 240, so it does not render.
--       `Spend Visibility module` — the TITLE and the HEAD of `91aec8e4` (C3). Also in ONE
--         `data.matrix` cell of `ff952010` (H4); `data` does not render, so it is not in the prompt.
--       `2026-10-05` — both hits are already inside `"date":"2026-10-05T` values, the `created_at`
--         of `f22e4c8d` (H5) and `8f683e41` (H7). Neither is a launch date and neither is a fact
--         this sweep may rewrite: a creation timestamp is the row's own history.
--
-- THREE CORRECTED, SEVEN HELD — the split, and why it is not ten corrections. A `corrected` verdict
-- retires the row and inserts a replacement, which is the right instrument only where a wrong fact
-- is in a RENDERED field. Three rows are like that. On the other seven the same literal appears as a
-- quoted wrong value the body exists to refute (H1), as the date NOT to use (H2, H3), inside one
-- `data.matrix` cell on a record that IS a 7x6 matrix a replacement would drop (H4), or as a
-- source-access / scan date (H5, H6, H7). Retiring any of those would delete a right row to remove
-- a string that never reaches a prompt. `holds` merges the recheck stamp into the live row instead.
--
-- NOT IDEMPOTENT. `corrected` inserts ONE replacement per call, so a rerun inserts a second one;
-- `holds` would re-stamp. Every call below was run EXACTLY ONCE through the Supabase MCP
-- `execute_sql`, in the order written, one call per statement, and the uuid it returned is recorded
-- beside it. A call that returned a uuid is never rerun.
--
-- REASONS CARRY NO LITERAL. Every `reason` begins `AGT-566 sweep` and none of them repeats any of
-- the three strings — on a `holds` row the reason lands in `data.recheck.reason` on the LIVE row,
-- and on a `corrected` row in the replacement's fresh `data`, so a reason that quoted the wrong
-- string would put it back exactly where the sweep is removing it from.
--
-- THE HANDLE IS `AGT-470`, NOT `AGT-566`. The writer hardcodes `'AGT-470'` into `record_decision`'s
-- backlog handle and into `data.recheck.ticket` (`docs/design/agt-470-recheck-writer.sql`), so this
-- sweep is NOT findable by its ticket id in either place. It is found by its `reason` prefix,
-- `AGT-566 sweep`, which is what `tests/regression/agt-566-recheck-sweep.test.mjs` reads. T3 files
-- that, with the dropped `data`, as its own P5 row rather than editing the writer here.
--
-- R5, PROVEN BOTH WAYS BEFORE THE SWEEP (QA 2). C3's call sent with the row's OWN title and body:
--   ERROR: 23514: AGT-470: a corrected recheck of 91aec8e4-e608-4b90-800d-856ca90c3223 carries a
--   title or body that differs from the row's
-- `check_violation`, raised before `record_decision`, so it wrote nothing — `runner_decisions` and
-- `runner_before_images` both still held 0 rows for this cycle after it. Then the ten landed.
--
-- Rule #1 holds: no row written here names another agent. No migration, no DDL, no model call.

-- =====================================================================================================
-- CORRECTED — three rows whose RENDERED fields carry the wrong fact. Each retires its row and inserts
-- ONE same-`kind` `draft` replacement carrying `supersedes` and a fresh `data.recheck`. Titles are
-- the wordings `docs/design/agt-470-corrections.sql` already shipped for the same two corrections, so
-- the sweep and the originals read identically.
-- =====================================================================================================

-- C1 — `fe667377`, L130. `title` only; no `body` key, so the writer coalesces the row's own body,
-- which does not carry the wrong name (probed: body_grok false).
-- decision_id: 7974bc78-f591-45de-ab8d-797e0a26a4e9
-- replacement id: 527721e3-e39f-4b08-bbf5-5fb637b3132e
select public.apply_claim_recheck('e8dd30bb-3657-4860-af54-d7b020006391'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', 'fe667377-66cc-4c2e-aa6b-b9434fc5930e', 'verdict', 'corrected',
  'reason', $r$AGT-566 sweep (AGT-470 L130): the title names an enterprise product that does not exist; the product is Grok Bot with a waitlisted enterprise tier.$r$,
  'title', $w$Grok Bot (SpaceXAI) - agent teams and a waitlisted enterprise tier$w$
)) as decision_id;

-- C2 — `22215386`, L130. Same correction, the second scan's row for the same competitor.
-- decision_id: eae6d21e-e123-4ac8-ae11-25aca8a3e49d
-- replacement id: aaf80d48-bfa9-4d1e-abac-4e20aa258eb5
select public.apply_claim_recheck('e8dd30bb-3657-4860-af54-d7b020006391'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', '22215386-a4ad-40aa-a0f5-7260c96e9343', 'verdict', 'corrected',
  'reason', $r$AGT-566 sweep (AGT-470 L130): the title names an enterprise product that does not exist; the product is Grok Bot with a waitlisted enterprise tier.$r$,
  'title', $w$Grok Bot (SpaceXAI) - agent teams and a waitlisted enterprise tier$w$
)) as decision_id;

-- C3 — `91aec8e4`, L132. The only row where the literal is in the HEAD as well as the title, so this
-- is the only call that passes a `body`. ONE substitution, expressed as the substitution itself
-- rather than a retyped 1212-character body (pattern:3 — stable, reproducible, no transcription
-- risk): the clause replaced occurs EXACTLY ONCE in the live body, measured before the call
-- (`regexp_matches(..., 'g')` -> 1 row). `replace()` reads the row before the UPDATE retires it, and
-- the retired row keeps its body, so this statement derives the same string on any later replay.
-- decision_id: c164eb08-748d-4e94-92d6-ffb65c3038e8
-- replacement id: 3b788d0a-5ef1-4a15-adb4-e921b7a89eb2
select public.apply_claim_recheck('e8dd30bb-3657-4860-af54-d7b020006391'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', '91aec8e4-e608-4b90-800d-856ca90c3223', 'verdict', 'corrected',
  'reason', $r$AGT-566 sweep (AGT-470 L132): title and body name a module that does not exist; one substitution in the body.$r$,
  'title', $w$Hazel AI - AI procurement workflow for cities$w$,
  'body',  replace(
             (select body from public.market_records where id = '91aec8e4-e608-4b90-800d-856ca90c3223'),
             $f$and lists a Spend Visibility module with no description on the home page$f$,
             $t$and the module this record was first filed with does not exist - only a third-party directory line about "real-time spending visibility and alerts" (AGT-470 L132)$t$)
)) as decision_id;

-- =====================================================================================================
-- HOLDS — seven rows kept. No `title` and no `body` on any of them: `holds` changes no text by
-- definition, it merges `data.recheck` into the LIVE row and leaves `status` alone. None of these
-- seven is ever retired (kickoff §7).
-- =====================================================================================================

-- H1 — `63aa1ad2`, L130. The wrong product name is in the body only as the thing being refuted, past
-- character 240, so it never reaches a rendered head.
-- decision_id: e075b55a-9004-4aa8-8a2a-d104da14e95a
select public.apply_claim_recheck('e8dd30bb-3657-4860-af54-d7b020006391'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', '63aa1ad2-d138-460f-b23e-1ef9b7b281bf', 'verdict', 'holds',
  'reason', $r$AGT-566 sweep (AGT-470 L130): the body names the wrong product name only to say it is wrong; title and facts are right. Kept.$r$
)) as decision_id;

-- H2 — `52ec2a55`, L129.
-- decision_id: 35f56c2a-86b1-49ee-859a-24fbdc3e129c
select public.apply_claim_recheck('e8dd30bb-3657-4860-af54-d7b020006391'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', '52ec2a55-2159-4f86-bd1b-7fdf56b39c95', 'verdict', 'holds',
  'reason', $r$AGT-566 sweep (AGT-470 L129): the body gives the launch date only as the date NOT to use; the row says 2026-09-29. Kept.$r$
)) as decision_id;

-- H3 — `0f14dc6b`, L129. Same shape as H2, the second dots row.
-- decision_id: 656e2725-8932-4089-a6ce-e2058f61d484
select public.apply_claim_recheck('e8dd30bb-3657-4860-af54-d7b020006391'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', '0f14dc6b-8311-4a1f-b30b-950e0554cfff', 'verdict', 'holds',
  'reason', $r$AGT-566 sweep (AGT-470 L129): the body gives the launch date only as the date NOT to use; the row says 2026-09-29. Kept.$r$
)) as decision_id;

-- H4 — `ff952010`, L132. The one row where the literal is inside `data` (one `data.matrix` cell,
-- confirmed on this tree). A `corrected` replacement writes a FRESH `data` holding only `recheck`,
-- so correcting this row would destroy the matrix that IS the record.
-- decision_id: d9739795-1541-4c19-ae50-baa5a6254feb
select public.apply_claim_recheck('e8dd30bb-3657-4860-af54-d7b020006391'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', 'ff952010-6df8-42f0-aba3-00ae969343fd', 'verdict', 'holds',
  'reason', $r$AGT-566 sweep (AGT-470 L132): the module name sits in one data.matrix cell; title and body are right and data does not render. A replacement would drop the 7x6 matrix this record is; kept, cell recorded wrong here.$r$
)) as decision_id;

-- H5 — `f22e4c8d`. One of the two rows whose `created_at` IS the date string in the prompt.
-- decision_id: 556708e1-3690-4679-a24f-6004acefbd49
select public.apply_claim_recheck('e8dd30bb-3657-4860-af54-d7b020006391'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', 'f22e4c8d-6805-43ab-96fd-db902059a718', 'verdict', 'holds',
  'reason', $r$AGT-566 sweep: every match of the date string here is a source-access or scan date, never a launch date (AGT-470 L129 is about dots). Kept.$r$
)) as decision_id;

-- H6 — `e014e2cb`.
-- decision_id: 1baf6282-eda9-4f4b-aadf-d8411f9a177b
select public.apply_claim_recheck('e8dd30bb-3657-4860-af54-d7b020006391'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', 'e014e2cb-4f6f-4cd6-99be-2276b975ced8', 'verdict', 'holds',
  'reason', $r$AGT-566 sweep: every match of the date string here is a source-access or scan date, never a launch date (AGT-470 L129 is about dots). Kept.$r$
)) as decision_id;

-- H7 — `8f683e41`, the `customer_profile` row; the second `created_at` hit.
-- decision_id: 77b386b2-8473-40d6-9336-e82685b94c75
select public.apply_claim_recheck('e8dd30bb-3657-4860-af54-d7b020006391'::uuid, null, jsonb_build_object(
  'target', 'record', 'ref', '8f683e41-9329-489a-b372-7615b2372b54', 'verdict', 'holds',
  'reason', $r$AGT-566 sweep: every match of the date string here is a source-access or scan date, never a launch date (AGT-470 L129 is about dots). Kept.$r$
)) as decision_id;
