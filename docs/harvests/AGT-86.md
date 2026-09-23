<!-- DeepBench v7.0.542 | harvest | AGT-86 slice 1 — design reasoning for kickoff docs/kickoffs/v7.0.542-AGT-86-s1a-rulings-and-alerts.md (The Designer, cycle 386e52e6, 2026-09-23) -->

# AGT-86 slice 1 — harvest

Not required reading for the build. Everything a task depends on is in the kickoff.

## 1. Premise: alive

Slice 1's claim is "the Development Manager can rule on audit findings, and John's calls have one alert list." Measured live on `rallojeqnkgtxgsdsnqm`, 2026-09-23:

| Fact | Measurement |
|---|---|
| `public.audit_findings` rows | 6, all `2026-W37`: 4 `open` with `ruled_by` NULL, 2 `resolved` by `hand:review-govtooling-0910` |
| `audit_findings_kind_check` | `kind = ANY ('duplicate','contradiction','redundant','stale-or-irrelevant','competing-purpose')` — no `other` |
| `audit_findings_status_check` | `status = ANY ('open','resolved','not-a-defect')` — no `ticketed`/`carried`/`escalated` |
| Columns | `id, created_at, fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution, status, ruling, ruled_by, ruled_at, found_by, cycle_id` — no `check_slug`, `filed_backlog_id`, `john_call` |
| Other CHECKs | `confidence in (high, medium, low)`; `iso_week ~ '^\d{4}-W\d{2}$'`; `locations` is a non-empty jsonb array |
| Indexes | pkey on `id`; UNIQUE `audit_findings_fingerprint_iso_week_key (fingerprint, iso_week)` |
| Trigger | `audit_findings_guard BEFORE DELETE OR UPDATE … EXECUTE FUNCTION audit_findings_guard()`; the function raises on DELETE and when `ROW(id, created_at, fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution, found_by, cycle_id)` differs between NEW and OLD — so `status, ruling, ruled_by, ruled_at` are the only mutable band |
| `reversible_tables()` | 14 names: backlog_items, runner_directives, runner_drain_scope, runner_settings, governance_rules, epics, vision_claims, skill_profiles, agents, capabilities, capability_skill_profiles, agent_capability_assignments, ai_activity_log, runner_items — `audit_findings` absent; `reverse_decision()`'s `k_allowed` is the same list (prosrc offset 683) |
| `public.john_alerts` | `to_regclass` NULL |
| `claim_john_alerts` | 0 rows in `pg_proc` |
| `ip_block_alert_claim(uuid)` | exists, SECURITY DEFINER, EXECUTE anon=false, authenticated=false, service_role=true — the grant shape to copy |
| Grants on `audit_findings` | 0 rows for anon/authenticated in `role_table_grants` |
| `runner_model_lanes` | orchestrator `claude-opus-5`; mechanical `claude-sonnet-5`; judgment `claude-fable-5-1` |
| `docs/WORKING-WITH-JOHN.md:40` | "Until SES-402 and SES-413 slice 2 ship, an attended session stands in for the manager under the same rule." |
| `docs/runbooks/runner-cycle.md:2025` | step 4d: "only John's hand ingests, and only he rules (`status`, `ruling`, `ruled_by`, `ruled_at` are the ledger's one mutable band)" — file is 380,718 bytes against the 381,000 ceiling (282 bytes headroom); NOT edited this slice (slice 8) |
| `docs/governance/ASKS-TO-JOHN.md` | 26 rows A-01..A-26; 19 `moved-to-manager`, 7 `kept`; no row for the Auditor's rule (A-16 is the heal engine's twin) |
| `docs/runbooks/runner-cycle.md:508` | the stall claim: `UPDATE runner_cycles SET stall_notified_at = now() WHERE id = … AND stall_notified_at IS NULL RETURNING id` — 0 rows means a peer already pushed |

Nothing on the list exists yet, and nothing on it has been built elsewhere since the ticket was written. The premise is alive.

## 2. The discovery that split slice 1 into 1a / 1b / 1c

The scope as handed ("one migration + 2 repo files") cannot ship green. Three existing tests pin exactly the numbers this slice moves, on purpose:

- `tests/regression/ses-364-reverse-agent-rows.test.mjs:160` — `K_ALLOWED.length === 14` ("If a fifteenth …"), plus `K_ALLOWED` is imported by ses-399.
- `tests/regression/ses-399-attach-fails-closed.test.mjs:125-128, 344-347` — `REVERSIBLE_TABLES.length === 14`, deep-equal to `K_ALLOWED`, and the LIVE `reversible_tables()` cardinality asserted 14.
- `tests/regression/ses-413-manager-decides.test.mjs:185, 211-212` — exactly 26 rows A-01..A-26, `moved === 19`, `kept === 7`.

So adding `audit_findings` to `reversible_tables()`/`k_allowed` re-pins two tests, and adding row A-27 re-pins one. The full slice is six files (migration, new test, ASKS-TO-JOHN.md, ses-364, ses-399, ses-413) against a cap of 3. The cap is John's to waive, not mine (pattern:72), and splitting loses nothing: no ruling is written until slice 2's review script exists, so reversibility (1b) and the census row (1c) can land as the next two kickoffs before anything rules.

- **1a (this kickoff, 2 files):** migration `agt86_s1a_rulings_and_alerts` + `tests/regression/agt-86a-rulings-and-alerts.test.mjs`.
- **1b (next, 3 files):** migration `agt86_s1b_reversible_audit_findings` — `CREATE OR REPLACE public.reversible_tables()` with `audit_findings` as the 15th name AND `reverse_decision(uuid,text,text,uuid)`'s `k_allowed` widened in the same migration (identical identity list → no overload; assert `pg_proc` count 1 each and cardinality 15 with every name present as a quoted literal in `reverse_decision`'s `prosrc` — the SES-399 tie); `ses-364` `K_ALLOWED` gains `audit_findings` and its count goes 14→15 with a "sixteenth" message; `ses-399` `REVERSIBLE_TABLES` and both 14s go to 15. `reverse_decision()` restores by pk from `runner_before_images.row_data` — a ruling's before-image (status/ruling/ruled_by/ruled_at/filed_backlog_id/john_call) restores through the mutable band, and the trigger allows it because the immutable columns are unchanged. Verify that in 1b's QA with a rolled-back fixture: record a decision, rule the row, reverse, band back to NULL.
- **1c (after, 2 files):** `docs/governance/ASKS-TO-JOHN.md` row `| A-27 | docs/runbooks/runner-cycle.md:2025, step 4d | "only John's hand ingests, and only he rules" — the Auditor's ledger band | moved-to-manager | The Development Manager reviews the work list and rules within John's rules (AGT-86 §5, John 2026-09-23); a ruling is a recorded, reversible row (slice 1b), and the five calls he keeps route to john_alerts. |`; the header's "19 rows" → "20 rows" (7 unchanged), stamp line updated to the new version; `ses-413` row count 26→27 and moved 19→20, and its control (iv) at :262 stays on A-26 or moves to A-27 — the Builder picks whichever keeps the control shaped as the test describes. The A-16 twin stays as it is.

## 3. Alternatives considered

- **One kickoff with a cap waiver.** Rejected: the cap is John's to waive and he is out of the loop in this flow; the split costs nothing because nothing rules before slice 2.
- **Skip reversibility (1b) entirely, ruling band stays outside `reverse_decision()`.** Rejected: §19v — "no before-image logged → the write does not happen" — and the ticket's own §11(5) makes Dev Manager rulings "recorded, reversible decisions".
- **`claim_john_alerts()` SECURITY DEFINER with a `p_cycle_id` and its own before-image, like `ip_block_alert_claim`.** Rejected for now: `john_alerts` is not in `reversible_tables()` and the stamp is a notification fact, not a decision; the plain `LANGUAGE sql` guarded UPDATE is the `stall_notified_at` shape the ticket names. If a later slice wants alerts reversible, add the table to 1b's list then.
- **Proving the new CHECK vocabulary with a fixture INSERT.** Rejected: `audit_findings` refuses DELETE, so any fixture is permanent. The unique-index probe (insert a duplicate `(fingerprint, iso_week)` with the new values; CHECKs fire before the index, so 23514 pre-change vs 23505 post-change, zero rows written) discriminates without a write. `PGRST204` (unknown column) is the pre-change red for any payload naming `check_slug`, so the arm also runs a payload without it to see the kind CHECK itself.
- **Model.** Orchestrator lane `claude-opus-5`: the work is one migration with grant assertions and one credential-gated test — the shape SES-399 shipped on the same lane; the mechanical lane is for sweeps/imports, and grant mistakes here are a live exposure (SES-78a, SES-315), which is where a cheaper model grinds (pattern:125).

## 4. What 1a does not do

- No `audit_findings` row is ruled, ticketed or alerted; no code writes `john_alerts` yet (slice 2's review script and SES-435 item 3 are the first writers).
- `reversible_tables()` still 14 (1b). ASKS-TO-JOHN still 26 rows (1c). runner-cycle.md step 4d untouched (slice 8).
- `capture_migration_down` will classify the in-place ALTER of `audit_findings` as `refused`, so the red range containing this migration is card-only; that is a stated result, not a gap.
- The test's live half is `notRun` without `SUPABASE_SERVICE_KEY`; `.env.local` in the worktree carries `SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only — export the service key from `runner_secrets` inline for the run (memory: session credentials via runner_secrets).

## 5. Patterns applied

pattern:8 (narrowest layer: schema + grants, no harness), pattern:17 (extend `audit_findings` and the stall-claim shape rather than a parallel system), pattern:19 (atomic guarded claim, not a lock), pattern:64/66 (one item, minimum useful slice), pattern:72 (cap is John's to waive → split), pattern:92 (1b/1c recorded here for a cold session), pattern:124 (the tests this change would redden are re-pinned inside the same slice family, never left red), pattern:162 (the QA grades the change: pre-change red codes named per arm), pattern:164 (SES-78a/SES-315 grant facts designed in), pattern:168 (kickoff at 8,186 bytes).

## 6. Slice 1b — a ruling is reversible (kickoff `docs/kickoffs/v7.0.543-AGT-86-s1b-reversible-audit-findings.md`, 2026-09-23)

**Premise revalidated after 1a shipped (`075fc073`, migration `agt86_s1a_rulings_and_alerts` live, down classified `refused` as predicted).** `reversible_tables()` still returns the 14 names; `reverse_decision(uuid,text,text,uuid)` is exactly one overload and its `k_allowed` is the same 14; `attach_before_images()` refuses by that list, so a ruling on `audit_findings` cannot be given a reversal handle today. `audit_findings` now carries `check_slug`, `filed_backlog_id`, `john_call`, the widened CHECKs, and the guard's `prosrc` names `NEW.check_slug`. `john_alerts` exists with 0 rows. Premise alive.

**How `reverse_decision()` behaves on `audit_findings`, read from its live body, not assumed.** (1) An in-place restore is `UPDATE … SET (every non-generated column) = (row from the image)`. The `audit_findings_guard` trigger compares only the immutable `ROW(…)`; the image carries the same immutable values, so the whole-row write passes and only the band moves back. (2) The table has no `updated_at`, so the written-since guard cannot fire and a successful restore reads `restored 0, restored_unverified 1`, outcome `applied` — the same reading the seven SES-364 tables give; the runbook already tells cycles to read `restored_unverified`. (3) An INSERT image (`row_data NULL`) undoes as a DELETE by pk, which the ledger guard refuses; the sub-block catches it, counts `refused 1`, and the reason carries `audit_findings is append-only`. That is the correct fail-closed shape for an append-only ledger and the QA asserts it as a control rather than treating it as a defect. (4) No generated columns, so the `attgenerated` filter drops nothing.

**Why exactly these three files, and the two doc homes left stale on purpose.** ses-364 pins `K_ALLOWED.length === 14` and ses-399 imports `K_ALLOWED`, deep-equals it to its own `REVERSIBLE_TABLES`, and deep-equals that to the LIVE list. So the migration cannot ship without both test edits (a 15-name live list against a 14-name `K_ALLOWED` is red either way), and the cap of 3 is exactly filled. Two docs name "fourteen": `docs/runbooks/session-setup.md:416-417` (graded by ses-399:229, a regex on that sentence) and `docs/runbooks/runner-cycle.md:4720` (graded by ses-364:301 on its bold lead-in, which stays true as history). Editing session-setup.md forces the ses-399 doc regex to move in the same ship — a fourth file — so both sentences stay as they are in 1b and are carried: session-setup.md goes to 1c (whose file count becomes 3: `ASKS-TO-JOHN.md`, `ses-413`, `session-setup.md` — and the ses-399:229 regex moves with it, which makes 1c four files; the coordinator decides whether 1c splits again or the cap is waived), runner-cycle.md:4720 to slice 8, which already owns that file's bytes (282 of headroom). Until then those two sentences understate the list by one name; the kickoff's STOP LINE reports it so the next session does not rediscover it.

**Alternatives considered.** Reading the count off the live list inside the doc regex (a NUMBER_WORDS map) still forces the doc to change in the same ship — circular, rejected. Leaving `audit_findings` reversible only "by hand" (no allowlist change) contradicts §19v and the ticket's §11(5). Widening `reverse_decision()` by retyping the function from memory is the SES-45 "second implementation" defect — the kickoff makes the Builder take the body from `pg_get_functiondef` and change one array element.

**QA shape.** All fixtures live inside one `DO` block over the MCP that ends in `raise exception`, so the block's own failure rolls every write back and the exception text carries the measurements (the SES-399 method). The discriminating number is the attach: pre-change it raises the whole-batch refusal naming `audit_findings`; post-change it returns 1. `record_decision` needs exactly one of cycle/session (`ck_decision_attribution`) — the fixture uses a session name so no cycle row is touched. Residue is three counts re-read after the rollback: `audit_findings` 6, `runner_decisions`, `runner_before_images`.

**Patterns applied (1b).** pattern:8, pattern:17 (the SES-364 widening pattern, reused), pattern:72 (cap not mine to waive; doc homes carried, not squeezed in), pattern:92, pattern:124 (both tests re-pinned in the same ship), pattern:162, pattern:168.

## 7. Slice 1c — the Auditor's ruling is censused as moved-to-manager (kickoff `docs/kickoffs/v7.0.544-AGT-86-s1c-asks-to-john-a27.md`, 2026-09-23)

**Premise revalidated at `17125957` (= origin/dev).** `docs/governance/ASKS-TO-JOHN.md` still has 26 rows (19 moved, 7 kept), stamp `v7.0.514`, no row for the Auditor; `docs/runbooks/runner-cycle.md:2025-2026` still carries "only John's hand ingests, and only he rules"; `ses-413-manager-decides.test.mjs` pins 26 / A-01..A-26 / 19 / 7 at :185, :187-193, :211, :212 and its control (iv) drops A-26 at :262. Baseline: ses-413 green on the unchanged tree. Nothing else in tests/, scripts/ or docs/ pins the census size (grepped "26-row", "26 rows", "A-26", "**19 rows**"; ses-424h names the file in a comment only). Premise alive.

**Why 1c is two files and 1d exists.** The coordinator kept the cap (John's rule); session-setup.md's "fourteen" sentence is graded by ses-399:229, so it moves with that regex in 1d after 1b ships. 1c does not depend on 1b's live state — A-27's Why cites 1b by version.

**Why A-27 is `moved-to-manager` and not `kept`.** The ask is the ruling on an audit finding. AGT-86 section 5 (John, 2026-09-23) gives that to the Development Manager and reserves five calls; a ruling becomes a recorded, reversible row once 1b lands, which is exactly the shape the census gives the other 19 moved rows. A-16 (the heal engine's twin rule) was already marked moved-to-manager under the same reasoning, and A-27 names it so a reader sees the two are one rule in two homes. A `kept` mark would also have to name a reserved call in its Why (ses-413:52) and none applies — the Auditor's ruling is none of money / production / hire / switch / John's-own-ruling / undo.

**The pipe rule.** `assertInventory()` splits each row on `|`, so the new row's cells carry no backticks-with-pipes and no literal pipe; "section 5" is spelled out rather than "§5" for greppability. The header's date sentence gains "plus A-27 added 2026-09-23 (AGT-86)" instead of moving the 2026-09-18 stamp, so the original census date stays true. The count "19" appears three times in prose, one of them at the start of a hard-wrapped line (line 17) — the kickoff names all three so none is missed.

**QA shape.** The discriminating pair is the test against the doc in both mismatched directions: re-pinned test vs unchanged doc fails "expected 27, got 26"; unchanged test vs edited doc fails "expected 26, got 27". Only the pair is green. Control (iv) stays on A-26 — dropping any one row must still throw — so the Builder does not reshape the control.

**Patterns applied (1c).** pattern:8, pattern:17 (the census row is the existing structure), pattern:72, pattern:90 (John's section-5 wording carried into the Why, not paraphrased into new categories), pattern:92, pattern:124, pattern:162, pattern:168.

## 8. Slice 1d — session-setup.md names fifteen restorable tables (kickoff `docs/kickoffs/v7.0.545-AGT-86-s1d-session-setup-fifteen.md`, 2026-09-23)

**Premise revalidated at `c021e1d9` (= origin/dev), after 1b shipped (`88dc5406`).** Live `reversible_tables()` is 15 names with `audit_findings` last; `ses-399` already pins 15 at :127-129 and :349 (1b's re-pin). `docs/runbooks/session-setup.md:415-417` still says "the fourteen `public.reversible_tables()` returns … widened 7 → 14 by `SES-364`", and `ses-399:231` grades exactly that sentence, so the doc understates the live list by one name and the test is what keeps it that way. Baseline: ses-399 green on the unchanged tree. Premise alive; the slice is the two-file re-pin §6 predicted.

**What stays as "fourteen" on purpose.** session-setup.md:433 ("43 live decisions carry at least one image outside the fourteen") is SES-399's dated measurement, graded by ses-399:244 — history, not a claim about today. ses-364:366 grades a third sentence ("widened the allowlist to fourteen tables", SES-364's own act) — also history. runner-cycle.md:4720 lists the fourteen names and is slice 8's (282 bytes of headroom, and that file has its own stamp ceiling).

**The stamp trap, stated so the Builder does not trip it.** session-setup.md carries exactly five header stamps and session-hygiene check 7 caps a runbook at about five, so a new stamp retires the oldest (`v7.0.426`, SES-331). The two recent precedents differ — SES-331 moved its predecessor verbatim to `docs/SESSIONS.md`, SES-388 dropped its predecessor after proving by grep that every fact it carried was already in the body. 1d follows SES-388 (two files, not three): the kickoff names the four greps (`agent-prompt.js`, `agent-log.js`, `call_source`, `{{rule:B40}}`) whose hits prove the SES-331 stamp is fully homed in §3f and §2c, and requires the counts in the new stamp. If any grep is zero, the stamp is relocated, not dropped.

**QA shape.** The mismatched pair again: re-pinned test vs unchanged doc, and unchanged test vs edited doc, both fail the same clause; `everyClauseHasTeeth()` proves the re-pinned clause still has a mutation that breaks it.

**Patterns applied (1d).** pattern:8, pattern:72, pattern:92, pattern:124 (the doc regex moves in the same ship as the sentence), pattern:162, pattern:163 (the last doc home of the fifteen that this session can reach within the cap), pattern:168.
