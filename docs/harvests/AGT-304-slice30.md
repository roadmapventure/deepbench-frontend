# AGT-304 -- harvest, slice 30 (v7.0.911, cycle 95490bae, 2026-10-28)

## 1. Premise (alive), measured this cycle on tree 1c73b34
- `judgment_class_census` live: P1 44 / P2 141 / P3 131 / P4 41 / neutral 113 / **unclassed 4** (ratified 0, proposed 4); 474 live `vision_claims` rows, totals sum.
- The four: `VC-MAP-042`, `043`, `044`, `045`, `source_doc docs/vision/market-map.md`, all `created_at = classified_at = 2026-09-17T03:29:22.127756Z`, `class_scope unclassed`, `judgment_class NULL`, `status proposed`, each with a `class_reason` written at insert; every `claim_text` opens with `Exclusion`. No `runner_decisions` row classes them. Re-read live this turn, not recalled.
- Committed brief `docs/runbooks/standing-brief.md:444` (rendered 2026-10-08 07:55Z): `- **FLAG: 4 live claims still \`unclassed\`**`. Arm 2 of `ses-84` fails on it; arm 3 would fail on `unclassed.total must be 0`.
- The existing 113 `neutral` rows carry `judgment_class NULL` + `class_reason` + `classified_at` (sampled `VC-MAP-027`, `VC-CRITERIA-001`), so the UPDATE this slice makes produces rows of exactly the shape the table already holds.
- `runner_before_images` carries a `decision_id` column (sampled), and `runner_cycles` holds this cycle's row (`95490bae-…`, version `v7.0.911`), so T1's FK and its handle both resolve. `classification` is already a live `runner_decisions.kind`.

## 2. The BASELINE, and why slice 30's first assembly was refused
`scripts/pre-build-baseline.js` expands the related set from the kickoff's declared files -- the `anchors` block's paths, every whole backticked repo path, and every bare `tests/regression/...` mention -- and then runs `scripts/related-tests.js` over that union. The first assembly declared a 12-test block measured over `docs/runbooks/standing-brief.md` + the `ses-84` guard; the cycle's own credentialed measurement over the committed kickoff's **14** declared files is **20** tests, so `baselineCoverageFinding()` refused it `kickoff-baseline-narrower` (8 uncovered: `SES-213`, `agt-170`, `agt-240`, `agt-281`, `ses-004`, `ses-373`, `ses-378e`, `ses-413c`). The shipped block is that measurement, 3 red of 20, tree `1c73b34`, 2026-10-28T13:43:53Z.

Two mechanics worth keeping, because they are why the block fits under the 8,192-byte cap at all:
- `PER_TEST_LINE` and `measuredTestsFrom()` key on `path.basename()`, so a block line may name the test by basename and still align with a measurement that wrote absolute paths. 20 lines × 17 bytes of `tests/regression/` prefix is 340 bytes this kickoff did not have to spend.
- Naming them as basenames also keeps `declaredFiles()` from reading the block as a declaration. This kickoff declares 3 files -> a 17-test related set, a strict subset of the 20 the block measures, so a re-measurement is covered in the safe direction (a block wider than the graded set is not a finding; a narrower one is the refusal above).

## 3. Single cause, and why the fix is in the live world
Four claims inserted by the market-map session without the classing decision SES-84 made a precondition (decision 50baaef2-8e8d-42b6-9089-56a5f76db959, 306 before-images). The test grades exactly the invariant SES-84 shipped; loosening it would hide the next stranded insert (pattern:162 -- a check grades the change, never the live world, and the live world is what is wrong here). The fix is the SES-84 shape: `record_decision()` (`p_cycle_id` set, `p_session_name NULL` -- `ck_decision_attribution`), one `runner_before_images` row per claim (`cycle_id` set, `ck_before_image_attribution`; FK to `runner_cycles`), then the UPDATE. `reverse_decision()`'s allowlist holds `vision_claims` (SES-320), so one Reverse restores all four. `vision_claims` has no non-internal triggers and `updated_at` is deliberately not bumped, so the Reverse is never `refused_written_since` (SES-316). `classified_at` is set to the decision's own `decided_at`, read back after the RPC -- the one-`now()` property the DO-block form had.

## 4. The call (JOHN-0925-DESIGNER-DECIDES, reversible)
All four `neutral`, by the structural rule "claim_text opens with Exclusion" (pattern:99): the market map's exclusion list scopes its own tests; none is a candidate claim grounding P1-P4. Considered: `VC-MAP-043` as `classed` P1 or P3 (its text names both). Rejected for this slice: a claim takes one class, the row is a scoping note about the platform rather than a value claim, and one rule over four rows is the cheapest variant that proves the check; a Reverse re-opens it. The insert-time `class_reason` is kept on every row (CHECK `ck_vision_claim_classing_has_reason` needs reason + `classified_at`).

## 5. Transport
PostgREST only (`rpc/record_decision`, POST `runner_before_images`, PATCH `vision_claims`), because the Supabase MCP connector times out at 60s on larger writes (AGT-547/AGT-495/AGT-465) and the Builder must not depend on it. No DDL, so no `apply_migration` and no `capture_migration_down`; the undo path is the decision's before-images.

## 6. Anchors, re-resolved at assembly (AGT-226)
Each literal was resolved with the verifier's own command, `git grep -F -l -e <literal> -- . :(exclude)docs/kickoffs :(exclude)docs/harvests`, and each returned exactly the one file the anchor names:
- `docs/runbooks/standing-brief.md` -- `- **FLAG: 4 live claims still \`unclassed\`**` (the rendered line the fix removes).
- `tests/regression/ses-84-claims-classed.test.mjs` -- `unclassed.total must be 0 after SES-84` (arm 3's assertion).
- `scripts/render-standing-brief.js` -- `FLAG: ${unTotal} live claim` (line 726, the template that emits the FLAG). The first assembly anchored the long `judgment_class_census?select=…&order=ord` query string instead; this literal is 27 bytes, is the renderer's own FLAG template rather than a shared query, and resolves to that one file.

## 7. Ruled out this slice (unchanged from slices 27-29)
`agt-291`, `agt-184` (connector ceiling; John: leave `agt-184`); `ses-320b`, `agt-245`, `agt-79` (AGT-281 wedge; AGT-562 clears it, held by AGT-532's gate card); `ses-424h`, `agt-173`, `ses-424g`, `ses-415`, `agt-132` (two causes each). `agt-70` (ledger recognition) is the next single-cause candidate.
