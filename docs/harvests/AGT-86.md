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

## 9. Slice 2a — the Development Manager's review capability rows and `apply_audit_review()` (kickoff `docs/kickoffs/v7.0.546-AGT-86-s2a-audit-review-rows-and-rpc.md`, 2026-09-23)

### 9.1 Premise revalidated, and why slice 2 is 2a / 2b

Measured live on `rallojeqnkgtxgsdsnqm` 2026-09-23 with 1a (`075fc073`) and 1b (`88dc5406`) in place:

| Fact | Measurement |
|---|---|
| `audit_findings` | 6 rows, all `2026-W37`; 4 `open` (`ceae97f6-1613-4d12-a8eb-a5797e90fbae`, `a2cb598f-5cbb-43b7-85f7-6fda6ed09acb`, `c98393fe-b552-4a48-85e3-12820ed38af4`, `68d4746a-1224-4e4d-be49-a71f72b11129`), 2 `resolved`, 0 `carried`; columns now include `check_slug, filed_backlog_id, john_call`; status CHECK admits `ticketed/carried/escalated`; kind CHECK admits `other`; `john_call` CHECK = the five |
| `reversible_tables()` | 15 names, `audit_findings` the 15th — 1b's live state is present, so the review's rulings will be reversible |
| `john_alerts` | exists, 0 rows, `fingerprint` UNIQUE, `john_call` CHECK = the five; `claim_john_alerts()` EXECUTE anon=false, service_role=true |
| `apply_audit_review` | 0 rows in `pg_proc`; no file in `scripts/`, `tests/`, `docs/`, `api/`, `lib/` names `review-audit-worklist`, `dm-audit-review-intent`, `apply_audit_review` or `audit-review.js` |
| `agents` | `id = 'devmanager'`, name The Development Manager, lane `governance`, `is_active` true; ONE `agent_capability_assignments` row (`tenant_id 'global'`, `capability_slug 'run-project'`) |
| `run-project` links | 7 `capability_skill_profiles` rows, `level 2`, `is_required true`, `display_order` 1..7: dm-identity 1, dm-knowledge-platform 2, dm-behavior 3, dm-run-intent 4, dm-knowledge-cycle-card 5, dm-guardrails 6, dm-knowledge-patterns 7 |
| `dm-run-intent` | `llm_provider anthropic`, `llm_model claude-opus-5`, `max_tokens 8000`, `api_key_source platform`, `temperature 0`, `technical_services ["structured-output"]`, `guardrails {"must":[],"must_not":[]}`, `traits {schema, can_request_help:false}`, `execution_type ai`, `tenant_id NULL` |
| `capabilities` | 28 rows; `slug` UNIQUE; columns `id, slug, name, description, execution_type, tenant_id, created_at, display_phrase, default_intent_slug` |
| `record_decision` | one overload `(uuid, text, text, text, text, text, text DEFAULT NULL) → uuid`; `ck_decision_attribution` requires exactly one of cycle/session; `runner_decisions.kind` has NO CHECK — live kinds include `filing` (4), `agent-row` (21), `re-scope` (6); runner-cycle.md step 7b lists `ticket-status, ticket-scope, gate, removal, directive, settings, rule` |
| `runner_before_images` | `ck_before_image_attribution` = exactly one of cycle/session |
| `backlog_items` | CHECKs: `tier in (now,next,later)`, `status in (open, partial, delivered, done, removal proposed, removed)`, `scope_origin in (original, gate-review, john-named, discovered, pre-existing, enhancement)`, `size_stamp in (S,M,L)`, `ck_backlog_outcome_claim` via `outcome_claim_is_valid()` — `'none: audit root-cause fix'` returns true; `ck_backlog_title_not_class_string`; `max(row_ordinal)` 1188 |
| `source_file` | `tripwire-to-backlog` 6 rows (SES-225..228, 249, 262); `audit-ledger` 0 rows — the `--from-ledger` path never filed live, so the ticket's "read which prefix the ledger path used live, else AGT" resolves to AGT (`TRIPWIRE_PREFIX` in code is `SES`, but no ledger row exists) |
| `feature_id_counter` | `AGT` last_issued 86; `SES` 435 |
| AGT-86 | `epic_id 1af331b4-682e-4f8a-ac75-c68e0f1887fe` (Moat Support - Governance to Build the Moat), `tier now`, `type Tooling`, `P10 - Tooling` |
| `recompute_backlog_queue()` | `() → integer`, SECURITY DEFINER |
| `ladder_work_class('P10 - Tooling')` | `tooling` |
| `runner_model_lanes` | orchestrator `claude-opus-5` (the manager's lane; `agt-68` asserts every dm-* `llm_model` equals it) |
| `scripts/agent-prompt.js` | header line `# <name> — <role> · capability <slug> · model <model>`; sections render as `=== <LABEL> ===`; `--intent` omitted falls back to `capabilities.default_intent_slug` (SES-332); exit 2 on a missing capability |
| `tests/regression/agt-68-devmanager.test.mjs:377` | `assert.deepEqual(assigns.map(a => a.capability_slug), [RUN_PROJECT_CAPABILITY])` — a second assignment reddens it. `:364-374` filter `skill_profiles` by the listed slugs and count `run-project` links (7), so a new profile and a new capability's links do not move them |
| `.env.local` | `SUPABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only — no service key |

Premise alive: nothing of slice 2 exists, and 1b's live state (the ticket's stop condition) is present.

**Why 2a / 2b.** The ticket's four items are: skill rows (DB), `apply_audit_review()` (migration), `scripts/audit-review.js`, and the test. `agt-68:377` pins the manager's assignments to exactly `[run-project]`, so the skill rows cannot ship without a fourth file. Migration + script + `agt-86b` + `agt-68` is four against a cap of three, and the cap is John's to waive (pattern:72). The ticket itself offers the split; the seam that loses nothing is 2a = rows + function + both tests, 2b = the script + the test's script arms, because the script is a pure client of the function (`--prepare` reads rows, `--apply` calls the rpc, `--dry-run` re-implements the rpc's validation locally) and nothing rules until slice 3 runs the review live.

### 9.2 The intent row, verbatim (task 1 reads this block)

`capabilities.description`: `Reviews the Auditor's whole work list at once and groups findings by root cause: one ticket per root cause, one cleanup ticket for one-line fixes, not-a-defect rulings that stop a finding coming back, carries with a reason, and escalations of the five calls John keeps.` `display_phrase`: `reviewing the audit work list`.

`skill_profiles.dm-audit-review-intent.objective`: `Turn one week's audit work list into root-cause tickets, cleanup, not-a-defect rulings, carries and escalations — every finding placed exactly once, no cap on the tickets.`

`method`:

```
Your task_context carries week (ISO week under review), worklist (every open or carried audit finding: id, fingerprint, iso_week, kind, check_slug, locations, governing_fact, confidence, proposed_resolution, weeks_seen = how many distinct weeks this fingerprint has been seen, prior_rulings = earlier rulings on the same fingerprint), open_audit_tickets (open backlog rows filed by earlier reviews, so a root cause can reuse a ticket instead of opening a second one), and john_calls (the five decisions John keeps, verbatim). Review the WHOLE list at once, never one finding at a time. Group findings by ROOT CAUSE — like with like: the same missing rule, the same stale fact in several homes, the same broken check. Return groups; each group is exactly one of: root-cause (one new ticket with title, root_cause, fix and priority_class — or reuse_backlog_id when an open audit ticket already covers it), cleanup (ONE group bundling every tiny one-line fix into one ticket), not-a-defect (with the reason, so the finding never comes back), carry (to next week, with the reason — NOT allowed when weeks_seen >= 3: a finding that keeps coming back must be ticketed, cleaned up, ruled not-a-defect or escalated), escalate (john_call = which of the five, plus a plain-language summary of what John must decide — a fix that needs one of his calls is never ruled by you). Every finding id appears in exactly one group. There is no limit on how many tickets a review files. summary_for_john is 3–6 plain sentences: what the week found, what you filed, what waits on him.
```

`traits`:

```json
{"schema":{"type":"object","required":["groups","summary_for_john","patterns_applied"],"properties":{"groups":{"type":"array","items":{"type":"object","required":["kind","finding_ids"],"properties":{"kind":{"type":"string","enum":["root-cause","cleanup","not-a-defect","carry","escalate"]},"finding_ids":{"type":"array","items":{"type":"string"},"minItems":1},"title":{"type":"string","maxLength":200},"root_cause":{"type":"string","maxLength":1200},"fix":{"type":"string","maxLength":1200},"priority_class":{"type":"string","pattern":"^P([1-9]|10) - "},"reuse_backlog_id":{"type":"string","pattern":"^[A-Z]+-[0-9]+$"},"reason":{"type":"string","maxLength":600},"john_call":{"type":"string","enum":["rules","money","production","hiring","switch"]},"summary":{"type":"string","maxLength":600}}}},"summary_for_john":{"type":"string","maxLength":1200},"patterns_applied":{"type":"array","items":{"type":"integer","minimum":1},"description":"The decision patterns you applied this turn, by number (pattern:N). Empty when none; every number must exist in the library."}}},"can_request_help":false}
```

`name`: `Review the Audit Work List`; `skill_type_slug intent`; `execution_type ai`; `tenant_id NULL`; `llm_provider anthropic`, `llm_model claude-opus-5`, `max_tokens 8000`, `api_key_source platform`, `temperature 0`, `technical_services ["structured-output"]`, `guardrails {"must":[],"must_not":[]}` — all read off `dm-run-intent` at write time, never retyped.

The `DO` block: `record_decision(NULL, 'agt-86-auditor-0923', 'agent-row', 'AGT-86', 'AGT-86 slice 2a: review-audit-worklist capability, dm-audit-review-intent and six links for the Development Manager', '<reasoning with pattern:2 pattern:7 pattern:17 pattern:136>', public.ladder_work_class('P10 - Tooling'))`, then nine `runner_before_images` rows (`cycle_id NULL, session_name 'agt-86-auditor-0923', table_name, pk_value = the new row's uuid, row_data NULL, decision_id`) — the SES-89 convention: the undo of an INSERT is a DELETE, and `reverse_decision()` addresses each by pk (SES-286b). Skill type per pattern:136: the new row is an **Intent** Skill because it is the one-capability procedure and output contract, exactly as `dm-run-intent` is for `run-project`; identity, behavior, knowledge and guardrails are the manager's existing rows, shared unchanged. `dm-knowledge-patterns` is linked (display_order 6) because the contract requires `patterns_applied` and an agent cannot cite a library it is not shown (SES-424 slice 4/5); `dm-knowledge-cycle-card` is not, per the ticket — it is the build-cycle card.

### 9.3 `apply_audit_review()` — the full spec (task 2 reads this block)

Signature `public.apply_audit_review(p_cycle_id uuid, p_session_name text, p_week text, p_review jsonb) RETURNS jsonb`, `LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog`. One function body = one transaction; any `RAISE` rolls everything back, which is what makes the rpc probes in the test write nothing.

1. **Validation** (all before any write). `p_week ~ '^\d{4}-W\d{2}$'`. `(p_cycle_id IS NOT NULL) <> (p_session_name IS NOT NULL)` else `RAISE 'apply_audit_review: exactly one of p_cycle_id / p_session_name'`. `p_review->'groups'` is a non-empty array. Build `v_open` = ids of `audit_findings` with `status IN ('open','carried')`; `v_seen` = every id across all groups. Refuse: an id not in `v_open` (`'unknown or not open/carried finding <id>'`), an id appearing twice (`'finding <id> in two groups'`), an open/carried id missing (`'finding <id> not covered'`). Per group: `kind` in the five; `carry` → `reason` non-empty and, for every id, `weeks_seen` = `(select count(distinct iso_week) from audit_findings where fingerprint = f.fingerprint)` < 3 else `RAISE 'finding <id> has weeks_seen = <n> and may not be carried again'`; `not-a-defect` → `reason`; `escalate` → `john_call` in `('rules','money','production','hiring','switch')` and `summary`, else `RAISE '… escalate needs john_call and summary'`; `root-cause` → either `reuse_backlog_id` naming a `backlog_items` row with `status NOT IN ('done','removed')`, or all of `title`, `root_cause`, `fix`; `cleanup` → `fix` (the bundled list) and at most one cleanup group.
2. **Decision.** `v_dec := record_decision(p_cycle_id, p_session_name, 'filing', NULL, format('Audit review %s: %s findings → %s tickets, %s not-a-defect, %s carried, %s escalated', …), <summary_for_john> || E'\n' || <one line per group: kind, ids, reason/root_cause/summary> || E'\n' || <'pattern:N' per patterns_applied, or 'pattern:0'>, ladder_work_class('P10 - Tooling'))`. `p_backlog_id` is NULL because one review files many tickets (`runner_decisions_backlog_id_check` allows NULL).
3. **Tickets.** `n` = number of root-cause groups without `reuse_backlog_id` + (1 if a cleanup group). If `n > 0`: `INSERT INTO feature_id_counter (prefix, last_issued_number, updated_by_session) VALUES ('AGT', n, coalesce(p_session_name, 'cycle '||p_cycle_id)) ON CONFLICT (prefix) DO UPDATE SET last_issued_number = GREATEST(feature_id_counter.last_issued_number, (SELECT coalesce(max(split_part(backlog_id,'-',2)::int),0) FROM backlog_items WHERE backlog_id ~ '^AGT-[0-9]+$')) + n, updated_at = now(), updated_by_session = EXCLUDED.updated_by_session RETURNING last_issued_number` — the environment fact from cycle 601227fb: the counter can drift behind the board. Ids are `AGT-(last-n+1) .. AGT-last`. Per ticket, INSERT into `backlog_items` with: `backlog_id`; `tier` = group `tier` if present else `'next'`; `type 'Tooling'`; `priority_class` = group `priority_class` else `'P10 - Tooling'`; `title` = group `title` (cleanup default `'Audit cleanup ' || p_week || ': ' || count || ' one-line fixes'`); `description` = `'**' || priority_class || '.** ' || root_cause || E'\n\nFix: ' || fix || E'\n\nFindings (audit_findings):\n'` then one line per finding `'- ' || id || ' ' || fingerprint || ' [' || coalesce(check_slug,'-') || '] ' || locations::text || ' — ' || governing_fact`; `status 'open'`; `epic_id` = `(select epic_id from backlog_items where backlog_id = 'AGT-86')`; `source_file 'audit-review'`; `session_ref` = `coalesce(p_session_name, 'cycle '||p_cycle_id) || ' ' || current_date`; `row_ordinal` = `coalesce(max(row_ordinal),0)+1` (computed once, incremented per row); `filed_at now()`; `scope_origin 'discovered'`; `size_stamp` `'S'` for cleanup else `'M'`; `predicted_cycles 1`; `defer_status 'no'`; `scope_rationale` `'AGT-86: root cause of audit findings ' || ids`; `milestone NULL`; `enhancement_claim 'none: audit root-cause fix'`; `gate_count 0`. Before-image per INSERT: `(cycle_id, session_name, 'backlog_items', <new row uuid>, NULL, v_dec)`.
4. **Findings.** For every finding, image `to_jsonb(f)` under `v_dec` (table `audit_findings`, pk the uuid), then UPDATE: root-cause/cleanup → `status 'ticketed', filed_backlog_id = <new or reused id>, ruling = root_cause || ' / ' || fix`; not-a-defect → `status 'not-a-defect', ruling = reason`; carry → `status 'carried', ruling = reason`; escalate → `status 'escalated', john_call, ruling = summary`; all with `ruled_by 'devmanager', ruled_at now()`. The `audit_findings_guard` trigger permits this band and nothing else.
5. **Alerts.** Per escalated finding: `INSERT INTO john_alerts (source, john_call, summary, detail, ref_table, ref_id, fingerprint) VALUES ('auditor', <john_call>, <summary>, <group ids and governing facts>, 'audit_findings', <id>, 'audit:' || <fingerprint>) ON CONFLICT (fingerprint) DO NOTHING` — a finding escalated again next week does not re-alert while the first alert stands. (Not imaged: `john_alerts` is not in `reversible_tables()`; the alert is a notification fact, per §3 of the 1a harvest.)
6. `PERFORM recompute_backlog_queue();` then `RETURN jsonb_build_object('decision_id', v_dec, 'tickets', <array of new backlog_ids>, 'counts', jsonb_build_object('ticketed', …, 'not_a_defect', …, 'carried', …, 'escalated', …, 'tickets_filed', n, 'alerts', …))`.

Grants: `REVOKE ALL ON FUNCTION public.apply_audit_review(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated; GRANT EXECUTE ON FUNCTION public.apply_audit_review(uuid, text, text, jsonb) TO service_role;` (SES-315: the default ACL grants EXECUTE to the three by name; `FROM PUBLIC` alone leaves it open). Trailing `DO $$ … $$` in the same migration: `pg_proc` count for `apply_audit_review` in `public` = 1; `has_function_privilege('anon', 'public.apply_audit_review(uuid, text, text, jsonb)', 'EXECUTE')` false, same for `authenticated`, true for `service_role`; then the rolled-back fixture: `BEGIN INSERT INTO audit_findings (fingerprint, iso_week, kind, locations, governing_fact, confidence, proposed_resolution, found_by) VALUES ('agt86qa-weeks3', '2026-W01', 'other', '[{"location":"qa"}]', 'qa', 'low', 'qa', 'agt-86-qa'), (…'2026-W02'…), (…'2026-W03'…); PERFORM public.apply_audit_review(NULL, 'agt-86-qa', '2026-W03', jsonb_build_object('groups', jsonb_build_array(jsonb_build_object('kind','carry','reason','qa','finding_ids', <the three ids>)) , 'summary_for_john','qa','patterns_applied','[]'::jsonb)); RAISE EXCEPTION 'AGT86_QA_NO_REFUSAL'; EXCEPTION WHEN OTHERS THEN IF SQLERRM !~ 'weeks_seen' THEN RAISE; END IF; END;`. The carry refusal must fire before the coverage check (the four real open findings are not in the fixture's groups), so the validation ORDER in step 1 is per-group content rules first (kind, reason, weeks_seen, john_call, root-cause fields), coverage LAST — the kickoff states this; it is what lets the fixture prove `weeks_seen` without listing the live findings. After the block: `audit_findings` count = 6 (the three fixtures rolled back with the sub-block's exception), `runner_decisions` count unchanged.

`capture_migration_down` for a function that does not exist yet derives `DROP FUNCTION IF EXISTS public.apply_audit_review(uuid, text, text, jsonb)` — classification expected `captured`, refusals 0. Record both the down's decision handle and the skill-rows decision id in the ship notes.

### 9.4 Slice 2b — `scripts/audit-review.js` and the test's script arms (next kickoff, 2 files)

- **`scripts/audit-review.js`** (header names AGT-86 slice 2). Flags: `--prepare --week=<YYYY-Www> [--out=<json>]` builds the task_context of §9.2 from live rows over REST with the service key: `worklist` = `audit_findings?status=in.(open,carried)&select=id,fingerprint,iso_week,kind,check_slug,locations,governing_fact,confidence,proposed_resolution`, plus per fingerprint `weeks_seen` (count of distinct `iso_week` over ALL rows with that fingerprint) and `prior_rulings` (rows with the same fingerprint and `ruled_by` not null: `iso_week, status, ruling, ruled_by`); `open_audit_tickets` = `backlog_items?source_file=eq.audit-review&status=not.in.(done,removed)&select=backlog_id,title,status,description`; `john_calls` = the five verbatim from AGT-86 §5 as a constant; `week`. Exit 3 with `no open or carried findings — no Dev Manager run, no cost` when the worklist is empty (AGT-86 §6). `--dry-run=<answer.json> --week=…` runs `validateReview(review, worklist)` — an exported pure function with the SAME rules and order as §9.3 step 1 — and prints the refusals or `ok`; exit 1 on refusal. `--apply=<answer.json> --week=… (--cycle-id=<uuid> | --session-name=<name>)` POSTs `rest/v1/rpc/apply_audit_review` with `{p_cycle_id, p_session_name, p_week, p_review}` and prints `Decision <id> — reversible until <expires_at CST>: select public.reverse_decision('<id>', 'John', '<why>');` (read `expires_at` back from `runner_decisions`), the ticket ids and counts. No model call anywhere in the script: the review answer JSON comes from the manager's own run (`scripts/agent-prompt.js --agent=devmanager --capability=review-audit-worklist --task=<prepare output>` on the session lane, slice 3).
- **`tests/regression/agt-86b-audit-review.test.mjs` gains:** (D) `validateReview()` imported from the script refuses the same four shapes the rpc refuses (coverage, duplicate, carry at `weeks_seen 3` — a synthetic worklist row, no DB — escalate without john_call), accepts a covering review, and the SES-158 negative control (one id changed → the coverage refusal appears); (E) `--prepare` against the live rows returns a worklist whose ids equal the open/carried set and whose `john_calls` has 5 entries; `--prepare` exit 3 is asserted with a `--table` override only if the Builder adds one — otherwise NOT RUN with the reason, since the live ledger holds open rows. Pre-change: the import fails (module missing) — red.
- Files: `scripts/audit-review.js` (new), `tests/regression/agt-86b-audit-review.test.mjs` (edit). Tasks: script; test arms; close-out. Model `claude-opus-5`, orchestrator lane.

### 9.5 Alternatives considered

- **Validate in JS only, function trusts its caller.** Rejected: the function is the one write path (§19v — the before-image and the write in one transaction), and a trusting function is callable with any shape by any service-role holder; the dry-run duplicates the rules for a cheap local check, it does not replace them.
- **File tickets through `tripwire-to-backlog.js --from-ledger`.** Rejected by John's words (§13): one ticket per finding and a 3/week cap are the opposite of a root-cause review; the script is not edited or called here.
- **A new `runner_decisions.kind` (`audit-review`).** Rejected: no CHECK constrains `kind`, but step 7b's list is the documented vocabulary and `filing` already names "this decision filed tickets"; extending the vocabulary is a runbook edit (slice 8 owns runner-cycle.md's bytes).
- **Test the `weeks_seen` refusal over REST.** Impossible without a permanent fixture (`audit_findings` refuses DELETE); the migration's own sub-block proves it with rollback and the test proves the shared JS rule (2b). Stated, not hidden.
- **Link `dm-knowledge-cycle-card`.** Rejected per the ticket: the card is the build-cycle procedure and would push the review toward picking tickets.
- **Model.** Orchestrator lane `claude-opus-5`: one migration with grant assertions, nine reversible rows and a credentialed test — the SES-399/1a shape; grant mistakes are live exposure (SES-315), where a cheaper model grinds (pattern:125).

### 9.6 What 2a does not do

No finding is ruled; no ticket is filed; `john_alerts` stays at 0 rows. The script (2b), the ingest of the 59 and the first real review (slice 3), the Auditor's own rows and routine (7, 8) are later kickoffs. `ASKS-TO-JOHN.md` and runner-cycle.md are untouched.

### 9.7 Patterns applied (2a)

pattern:2 (the capability and its contract are rows, not code), pattern:7 (the manager's behavior lives in its own Skill row), pattern:8 (function + rows; no harness change), pattern:9 (validation is deterministic SQL; the model only groups), pattern:17 (extend `feature_id_counter`, `record_decision`, `runner_before_images`, `john_alerts` — no parallel ledger), pattern:19 (one atomic path for a many-row write), pattern:64/66 (one slice, minimum useful), pattern:72 (cap not mine to waive → 2a/2b), pattern:90 (John's "no limits" and the five calls carried verbatim), pattern:92 (2b specified here for a cold session), pattern:124 (agt-68 re-pinned in the same ship), pattern:136 (Skill type named and justified), pattern:162 (every QA arm has a pre-change red code), pattern:164 (counter drift, function-ACL default, `.env.local` facts designed in), pattern:168 (kickoff at 8,189 bytes).

## 10. Slice 4 — board-health and work-quality checks as plain code (kickoff `docs/kickoffs/v7.0.547-AGT-86-s4-board-checks.md`, 2026-09-23)

### Premise: alive

Neither `scripts/audit-board.js` nor `tests/regression/agt-86d-board-checks.test.mjs` exists in the worktree (ls, 2026-09-23). Nothing on the board runs the five checks AGT-86 §3(2)/(3) name; the Ticket Owner counts stale rows (`ticket-owner.js` :373) and flags none of them.

### Measurements the kickoff rests on

- `prime_directive_queue()` (pg_get_functiondef): the buildable CTE admits a row only through `public.epic_project_executing(b.epic_id)` or the enhancement fence; there is no path for `epic_id IS NULL`. So "no home" = epic_id NULL or `epics.project_id` NULL. Live: 540 of 604 open+partial rows epic_id NULL; 0 epics-without-project.
- `runner_settings` id=1: `chain_max_noship_streak` = 4. N is read live, never typed.
- `runner_cycles` 617 rows: `backlog_item_id` NULL on 375, `item_id` text set on 364, and 37 `item_id` values match no `backlog_items.backlog_id` (fixtures, dead ids — dropped by the join). Keyed on `backlog_item_id` alone, SES-424 has ZERO cycles; keyed on `COALESCE(backlog_item_id→backlog_id, item_id)` it has 8 (2026-09-20 08:41Z … 2026-09-21 00:41Z). That coalesce is the load-bearing join and the reason the smoke arm exists. Live ≥ 4 without done/removed: SES-378 (10), SES-424 (8), SES-422 (4).
- `runner_before_images`: 3,293 backlog_items images; 19 carry `row_data.defer_status='yes'` across 12 tickets (DAT-25, SES-123, SES-237, SES-319, SES-391, SES-397, SES-402, SES-408, SES-416, SES-417, SES-424, SES-82); all 12 are still 'yes' live. Live count 0. SES-434's own removal decision (2026-09-21 16:06Z) says the reset it reported was never persisted — the ticket's example was a false alarm, which is itself an argument for the check being code: it answers the question in one read.
- `runner_verdicts.verdict` values: approve 141, block 126. Latest-per-ticket join to `status='done'`: 34 block (AGT-69, AGT-70, AGT-79, AGT-80, LOG-104, LOG-145, LOG-149, MOB-22, SES-180, SES-205, SES-207, SES-213, SES-216, SES-218, SES-219, SES-223, SES-301, SES-311, SES-343, SES-344, SES-345, SES-352, SES-353, SES-354, SES-355, SES-360, SES-367, SES-368, SES-373, SES-374, SES-376, SES-389, SES-51, SES-53), 94 approve.
- Stale by the Ticket Owner's own predicate (status 'open', `(filed_at ?? created_at)` older than 30 d, revalidated_at NULL): 440; by updated_at: 404; both: 404; revalidated: 13. The kickoff mirrors `:244`/`:373` exactly (filed_at ?? created_at) so the Auditor's flagged set equals the Ticket Owner's counted set.
- `audit_findings` constraints: kind enum now holds 'other' (slice 1a); status enum open/resolved/not-a-defect/ticketed/carried/escalated; UNIQUE (fingerprint, iso_week); `check_slug` and `john_call` columns exist. `audit-ledger.js` `toRow()` copies check_slug through nothing — it carries kind/locations/governing_fact/confidence/proposed_resolution/status/ruling/found_by/cycle_id only. Slice 3 (ingest) is where `check_slug` reaches the row; this slice puts it on the finding so nothing is lost.
- `audit-cluster.js` `FINDING_KINDS` (:90) still lists five kinds without 'other'. It validates model-cluster output, not the ingest; left alone (slice 7 owns it).
- Baseline red set on the unchanged tree (mechanical, `scripts/baseline-red-set.js`): agt-79-ticket-owner RED (state-file directory assertion — one of the 12 inherited reds), agt-70-auditor green.

### Decisions

1. **Thresholds are imported, which needs one export.** `D30` and `H48` are locals of `classifyBoard`. The cheapest structural fix is `export const UNREVALIDATED_DAYS = 30` in ticket-owner.js and one use at :200 — behaviour byte-identical, and the test asserts the export (pattern:14, pattern:93). H48 is not exported: no slice-4 check uses it (pattern:66).
2. **Aggregate over 25 (coordinator's volume rule), with ONE stable fingerprint (coordinator amendment, same day).** Three checks are far over the line today (540 / 440 / 34); one finding each keeps the manager's review to one root cause per check. A first draft put every row in `locations` and the count in `governing_fact`; `fingerprint()` (audit-ledger.js :145-148) hashes `kind | sorted locationKey(loc) | normalize(governing_fact)` — location `text` is read nowhere in it — so that draft would have minted a new fingerprint every Monday and the escalate rule (weeks_seen ≥ 3) could never fire on the biggest board problems. Shipped form: one location `audit-board/<check_slug>` whose text carries the count and ids, governing_fact = the rule only, count in proposed_resolution. Test arm: two rosters, one fingerprint, via the ledger's own exported function.
3. **Kinds.** stale → `stale-or-irrelevant` (exact fit); closed-red and deferral-undone → `contradiction` (the row's status contradicts its verdict / its own image); no-home and repeat-worked → `other` (no existing kind describes a ticket the queue cannot see or a ticket worked past the streak).
4. **Model.** Judgment lane (`claude-fable-5-1`), same as slices 1a–1d: the coalesce join, the aggregate rule and the ledger round-trip are decisions against live data, not a doc sweep (pattern:125). The script's runtime lane is none.
5. **Read-only by construction.** No `--apply`, no POST, no decision row, no before-image — none is needed because nothing changes (CLAUDE-DESIGN Backlog Capture applies to writes only). The live arm asserts the audit_findings count is unchanged after the run.

### Alternatives not taken

- Keying cycles on `backlog_item_id` only: misses SES-424 and 375 rows; rejected on the measurement above.
- Flagging stale per row: 440 findings in one review; the volume rule exists for this.
- Filing through `tripwire-to-backlog.js --from-ledger`: retired by design decision 13 (section 1 of this harvest).
- Putting the checks inside ticket-owner.js as checks 13–17: they are the Auditor's, and the Ticket Owner's twelve are date-fenced row-hygiene checks with a write pass; mixing a read-only weekly audit into a nightly writer widens the wrong file (pattern:8, pattern:15).

### Patterns applied

pattern:9 (deterministic where a mechanism serves), pattern:14, pattern:17 (extend the ledger's finding shape rather than a parallel one), pattern:38 (count everything: coalesce join, no convenient filter), pattern:66, pattern:93, pattern:162 (the test grades fixtures, the live arm only proves the path), pattern:164.

## 11. Slice 2b — `scripts/audit-review.js` and the test's script arms (kickoff `docs/kickoffs/v7.0.548-AGT-86-s2b-audit-review-script.md`, 2026-09-23)

**Premise.** Designed while 2a (`v7.0.546`) was building; measured on the pre-2a tree: no `scripts/audit-review.js`, no `agt-86b` test, no `apply_audit_review` in `pg_proc`. The kickoff assumes 2a ships as §9.3 specifies and makes the Builder's first task prove it: a deliberately invalid `rpc/apply_audit_review` call must come back `P0001` (a `PGRST202` means the function is not live → stop), and `capabilities?slug=eq.review-audit-worklist` must return one row. Premise alive by construction; the stop is the guard.

**Shape, and why.** Two files (script new, `agt-86b` extended with arms D/E/F), four tasks. The script has a pure half (`JOHN_CALLS`, `buildTaskContext`, `validateReview`) that the test imports, and a CLI half under the `import.meta.url === pathToFileURL(process.argv[1])` guard — the `audit-ledger.js` / `tripwire-to-backlog.js` shape, so the rules the test grades are the rules the CLI runs (SES-45). `validateReview` carries the function's rules, ORDER (per-group first, coverage last) and message texts verbatim from §9.3, so a `--dry-run` refusal reads exactly like the rpc's; `--apply` runs it before any request, which is what lets arm F prove "refuses before it sends" with a dead `SUPABASE_URL` and no credentials. `--apply` takes `--context=<prepare.json>` rather than re-reading live rows so that the same worklist the manager reviewed is the one validated against (a finding ruled between prepare and apply would otherwise surface as an unexplained coverage refusal; with the context file it surfaces at the rpc as `not open/carried`, which is the honest place).

**Exit 3 without a fixture.** `audit_findings` refuses DELETE, so the "no findings" state cannot be staged live. The pure half returns `null` for an empty worklist and the CLI maps it to exit 3 with AGT-86 §6's sentence; the test proves the pure half and greps the mapping. Stated as the limit it is; a future week with an empty ledger proves the CLI path live.

**Alternatives.** A `--stub-url` flag so arm E could assert exit 3 against a fake server — rejected as test plumbing in a production script (pattern:67). Letting `--apply` skip local validation ("the function checks anyway") — rejected: a refusal costs a network round trip and a decision-ledger touch it need not make, and one validator with two doors is the SES-45 point. Model: orchestrator lane `claude-opus-5` — the validator must mirror SQL semantics exactly, which is judgment, not formatting.

**What 2b does not do.** No model call; no finding ruled; no ticket filed; `john_alerts` untouched. Slice 3 runs `--prepare`, the manager on the session lane (`scripts/agent-prompt.js --agent=devmanager --capability=review-audit-worklist --task=<context>`), and the first real `--apply`.

**Patterns applied (2b).** pattern:8, pattern:9 (deterministic validation, no model), pattern:14 (one validator, imported by the test), pattern:17 (existing script shape), pattern:64/66, pattern:67 (no test-only flag), pattern:90 (John's five calls verbatim), pattern:92, pattern:162 (every arm red before, named), pattern:164 (`.env.local` and exit-code conventions designed in), pattern:168.

## 12. Slice 3 — the Auditor files its own findings; the weekly report counts what was found (kickoff `docs/kickoffs/v7.0.549-AGT-86-s3-ledger-self-ingest.md`, 2026-09-23)

### 12.1 Premise: alive

Measured 2026-09-23 on tree `586718f3` and the live database:

| Fact | Measurement |
|---|---|
| `audit_findings` | 6 rows, all `2026-W37` (4 open, 2 resolved); every `cycle_id` set; every `check_slug` NULL |
| `scripts/audit-ledger.js` | `:349` refuses `--apply` without `--cycle-id`; `:388` posts every before-image with `cycle_id` only; `toRow` `:204-223` carries no `check_slug`; `renderReport(week, rows)` `:167-195` renders ledger rows only; `doReport` `:404-422` never reads `docs/audits/<W>-candidates.json` |
| `runner_before_images` | `ck_before_image_attribution` = exactly one of `cycle_id` / `session_name`; `decision_id` nullable |
| `docs/audits/2026-W38.md`, `2026-W39.md` | 198 bytes each: `# Audit … — 0 findings (0 open · 0 resolved · 0 not a defect)` |
| `docs/audits/2026-W38-candidates.json` | 21 `findings` + 4 `carried` (the carried carry `found_by 'carry:2026-W37'`, `status 'open'`); no `check_slug` on any entry |
| `docs/audits/2026-W39-candidates.json` | 30 `findings` + 4 `carried` (the same four W37 fingerprints) |
| Fingerprints (pure `fingerprint()` over both files against the six live fingerprints) | W38: 25 distinct, 21 `new` + 4 `recurring`, 0 `seen`; W39 (after W38): 34 distinct, 30 `new` + 4 `recurring`, 0 `seen` — none of the 30 W39 findings share a fingerprint with a W38 finding. Both ingests append 59 rows → 65 |
| `agt-70-auditor.test.mjs` | part D pins `renderReport(WEEK, rows)` byte-for-byte for open/resolved rows; `:1244-1251` asserts `toRow` properties only (never a whole-row deepEqual) — so an added `check_slug` key and an optional third `renderReport` argument leave it exactly as red or green as it is today (it is one of the 12 inherited reds) |
| "for John to read" | not in `audit-ledger.js` at all; it lives in runner-cycle.md step 4d (slice 8) and `audit-cluster.js:749`'s `note` field (slice 7). The ledger's own dry-run prints only the summary line and exits 1 with no sentence naming the next step |
| `runner_model_lanes` | orchestrator `claude-opus-5`, judgment `claude-fable-5-1`, mechanical `claude-sonnet-5` |
| `apply_audit_review` | still absent from `pg_proc` at design time (2a building as v7.0.546); `scripts/audit-review.js` absent (2b, v7.0.548) — the first run (§12.4) waits on both |

The premise is alive: an attended session cannot ingest at all, and the weekly report counts ledger rows only.

### 12.2 Decisions

1. **Attribution is a pure function the CLI calls first.** `attribution({cycleId, sessionName, apply})` throws on both flags in any mode and on `--apply` with neither, so the refusal fires before the file is read and before `creds()` — which is what lets the test grade it with no credentials (arm D) and is why the pre-change stderr differs (`SUPABASE_URL…` / `requires --cycle-id`). `beforeImage()` is exported for the same reason: the row shape the CHECK constrains is graded without a network.
2. **No `record_decision` on the ingest.** Slice 1b measured that the ledger guard refuses the DELETE an INSERT image would need, so `reverse_decision()` reports an ingest `refused`, never restored. A decision handle here would promise an undo the platform cannot perform (pattern:33 — do not show what cannot be verified). The image carries only the attribution `ck_before_image_attribution` demands; a session ingest leaves `audit_findings.cycle_id` NULL, exactly as `this_slice` states. The `CLAUDE-DESIGN.md` Backlog Capture rule is satisfied at the image level (the ticket's own §3(1) example is about images, not decisions).
3. **`renderReport` gains an optional third argument, and the legacy shape is byte-stable.** `found = null` with every row in `open/resolved/not-a-defect` renders today's text unchanged — agt-70 part D's pin is the control. Any other input (a `found` count, or a row in `ticketed/carried/escalated`) switches to the counted header `<F> found, <L> filed[ yet]`, the `Found this run` line, the six-status `Ledger:` line and the `Root-cause tickets:` line. F comes from the candidates file (`findings.length + carried.length`), L from the ledger; the two are named separately because they are different meanings (pattern:40) and a week with F > 0 and L = 0 reads `25 found, 0 filed yet` — never `0 findings` (pattern:34, pattern:38).
4. **`docs/audits/2026-W37.md` is not re-rendered.** Its candidates file holds 24 judgment-run findings that were never ingested while the ledger holds 6 hand-seeded rows; a re-render would honestly read `24 found, 6 filed` and would make W37 look like an unfinished week when its review is what the 4 carried fingerprints already carry into W38/W39. The coordinator renders W38 and W39 only, per `this_slice`.
5. **Model.** `claude-opus-5`, orchestrator lane — the same lane every AGT-86 build slice has used in this attended session; the work is one script edit with a byte-stable rendering contract and a credentialed test, not a doc sweep (pattern:125).

### 12.3 Alternatives not taken

- **Count "found" from the ledger's `new + recurring` verdicts at report time.** Rejected: the report must read the file, because the whole defect is that the ledger holds nothing until someone ingests; a report that counts only what the ledger knows is the `0 findings` report by another route.
- **Drop the two-arg legacy shape and re-pin agt-70 part D.** Rejected: agt-70 is an inherited red the Builder does not own; touching it is a third file for no user-visible gain (pattern:65, pattern:124 applies only to breakage this slice causes).
- **Have the ingest itself write `docs/audits/<W>.md`.** Rejected: `--report --write` already exists and runner-cycle.md 4d calls it after the ingest; one writer per file.
- **Change runner-cycle.md 4d's "only John's hand ingests" sentence now.** Not this slice: 282 bytes of headroom under the SES-336 ceiling and the step moves to the Auditor routine's own runbook in slice 8.

### 12.4 The first run — the coordinator's checklist (item 4; after this ship, 2a and 2b are live)

```
export SUPABASE_URL=… SUPABASE_SERVICE_KEY=…   # from runner_secrets, inline
node scripts/audit-ledger.js --ingest=docs/audits/2026-W38-candidates.json --week=2026-W38 --session-name=agt-86-auditor-0923 --apply
   → ingest 2026-W38: 25 findings, 21 new, 0 seen, 4 recurring, 0 ruled-out
node scripts/audit-ledger.js --ingest=docs/audits/2026-W39-candidates.json --week=2026-W39 --session-name=agt-86-auditor-0923 --apply
   → ingest 2026-W39: 34 findings, 30 new, 0 seen, 4 recurring, 0 ruled-out
select iso_week, count(*) from audit_findings group by 1;            → W37 6, W38 25, W39 34
select count(*) from runner_before_images where session_name='agt-86-auditor-0923' and table_name='audit_findings' and cycle_id is null and row_data is null;  → 59
node scripts/audit-ledger.js --report=2026-W38 --write   → report 2026-W38: 25 found, 25 filed -> docs/audits/2026-W38.md
node scripts/audit-ledger.js --report=2026-W39 --write   → report 2026-W39: 34 found, 34 filed -> docs/audits/2026-W39.md
grep -c "0 findings" docs/audits/2026-W38.md docs/audits/2026-W39.md   → 0 and 0
node scripts/audit-review.js --prepare --week=2026-W39 --out=$S/ctx.json
   → worklist 63 ids (4 open W37 + 25 W38 + 34 W39); the 4 W37 fingerprints carry weeks_seen 3 (12 rows) and may not be carried
node scripts/agent-prompt.js --agent=devmanager --capability=review-audit-worklist --task=$S/ctx.json  → run as a session sub-agent → $S/answer.json
node scripts/audit-review.js --dry-run=$S/answer.json --week=2026-W39   → ok
node scripts/audit-review.js --apply=$S/answer.json --week=2026-W39 --session-name=agt-86-auditor-0923
   → Decision <id> — reversible until …; tickets AGT-<n>…; counts
select status, count(*) from audit_findings group by 1;   → open 0; ticketed/not-a-defect/carried/escalated sum to 63; resolved 2
node scripts/audit-ledger.js --report=2026-W38 --write && node scripts/audit-ledger.js --report=2026-W39 --write   → both carry `Root-cause tickets:` when any group was root-cause/cleanup
```
Counts to report: rows per week (6/25/34), images (59), tickets filed, alerts (`john_alerts` rows, one per escalated finding), and the decision handle. Commit the two reports and the two candidates files in the coordinating session's commit, not the Builder's.

### 12.5 What slice 3 does not do

No board check (slice 4), no new Auditor skill row or capability (slice 7), no routine and no runner-cycle.md edit (slice 8), no learning loop (slice 9). `audit-cluster.js:749`'s "John reads" note and `FINDING_KINDS` without `other` stay until slice 7. `docs/audits/2026-W37.md` is untouched.

### 12.6 Patterns applied

pattern:9 (deterministic ingest and report; no model call), pattern:17 (extend `toRow`/`renderReport`/`doReport`, no parallel report), pattern:33 (no decision handle that cannot restore), pattern:34 and pattern:38 (the report renders found findings, never a convenient `0`), pattern:40 (`found` and `filed` named as different meanings), pattern:64/66 (items 1-3 only; the first run is the coordinator's), pattern:65 (legacy render shape kept rather than re-pinning agt-70), pattern:90 (`this_slice`'s wording — `--session-name`, `cycle_id` NULL, "new findings to file", "N found, 0 filed yet" — carried literally), pattern:92 (§12.4 written for a cold coordinator), pattern:125 (orchestrator lane), pattern:162 (every arm has a pre-change red), pattern:164 (`.env.local` has no service key; attribution CHECK designed in), pattern:168 (kickoff ≤ 8,192 bytes).

## 14. Slice 7 — the Auditor's skill rows carry the checklist, nine homes and one capability per job (kickoff `docs/kickoffs/v7.0.551-AGT-86-s7-auditor-checklist-rows.md`, 2026-09-23)

### 14.1 Premise revalidated

Measured live on `rallojeqnkgtxgsdsnqm` 2026-09-23:

| Fact | Measurement |
|---|---|
| `auditor` | `agents.id 'auditor'`, The Auditor, lane `governance`, `is_active true`; 2 `agent_capability_assignments` (`d0beef61…` audit-agent-data, `489a0b2a…` audit-governance-corpus), `tenant_id 'global'` |
| `au-behavior` | `objective NULL`, `method NULL`, `traits` = `writing_style` + `reasoning_style` (745 chars); `technical_services []`; llm `anthropic/claude-fable-5-1/6000/temperature NULL/platform` |
| `au-knowledge-homes` | objective 125 chars "Hold the five homes…"; method 1,960 chars — five homes, five kinds, the ledger, the powers; no `other`, no `check_slug`, no interviewquestions, no claude-config, no outside source |
| `au-corpus-intent` | schema `required [kind, locations, governing_fact, confidence, proposed_resolution]`, kind enum of five, `handler auditor-write`, `can_request_help false`; `technical_services ["structured-output"]`; `guardrails {"must":[],"must_not":[]}` |
| web search | `api/prompt/db-assembly.js:333` reads `traits.enable_web_search === true` on the targeted Intent row; `:342` `web_search_max_uses` positive integer; live example `rs-research-intent` true/8 with `technical_services ["structured-output","web-search"]` |
| `skill_types` | behavior, format, guardrails, identity, intent, knowledge |
| `reversible_tables()` | 15, including all four tables this slice writes |
| `agt-70-auditor` baseline | GREEN on the unchanged tree without credentials (`baseline-red-set.js`: Red set 0 of 1) — the "inherited red" in the ticket text is the credentialed run (part Q spawns the CLIs live). Parts P/Q pin inline seed shapes and `--agent=auditor` exit 0/2; neither reads `au-behavior.method`, so this slice does not touch it |
| slice 4 slugs | `docs/kickoffs/v7.0.547-AGT-86-s4-board-checks.md:35` — `CHECK_SLUGS = [board-no-home, board-repeat-worked, board-deferral-undone, board-stale, quality-closed-red]`, locations `backlog_items:<ID>` |

Premise alive: the Auditor's rows hold no checklist, five homes, five kinds and two capabilities.

**Slug reconciliation (pattern:53, one name per object).** The ticket's slice-7 list names `board-stale-or-fixed` and `board-never-closes`; slice 4's code already emits `board-stale` and `board-repeat-worked`. The checklist uses the code's names for the five deterministic checks and splits the judgment half of "stale or fixed" into its own check, `board-already-fixed`. 23 checks: consistency 5, board health 6, work quality 4, full review 4, advisor 4.

**Why one kickoff, not 7a/7b.** Every write is a database row; the only repo file is the test. 1 file, 4 tasks, one `DO` block (session-setup 3d: one transaction so `decided_at` and every `updated_at` share one stamp).

### 14.2 `au-knowledge-homes` — objective and method, verbatim (task 1a)

`objective`:

```
Hold the nine homes the Auditor reads, the six finding kinds, what a fingerprint and a check_slug are, and the powers no resolution may touch.
```

`method`:

```
THE NINE HOMES. Five since AGT-70 (2026-09-10): (1) the Skill rows of every agent in the governance lane — skill_profiles joined through capability_skill_profiles and agent_capability_assignments; (2) public.governance_rules (status live) and each row's canonical_doc; (3) public.runner_directives with status open; (4) the runbooks under docs/runbooks/, the CLAUDE*.md files, docs/SELFBUILD-CHARTER.md, docs/GOVERNANCE-MODES.md, docs/ARCHITECTURE.md section 19 and docs/RUNNER-GOV-*.md; (5) tooling configuration — scripts/*.js headers, .claude/rules/*.md, .claude/settings.json, vercel.json, .github/workflows/ci.yml and docs/runbooks/routine-prompt.md. Four more since AGT-86 (2026-09-23): (6) the board and shipped work — public.backlog_items, runner_cycles, runner_verdicts, runner_decisions, the audit_findings history, and the output of scripts/audit-board.js, whose findings arrive already judged; (7) the interview-questions project — repo roadmapventure/interviewquestions (PRIVATE): its CLAUDE.md, .claude/ and docs; (8) Claude's local configuration, read through the PRIVATE repo roadmapventure/claude-config (memory/<folder>/**, user/settings.json, projects-root/CLAUDE.md, projects-root/.claude/settings*.json and hooks/**, interviewquestions/.claude/**), refreshed daily by John's copy job — secrets arrive redacted as <REDACTED:kind>, and a redaction marker is the copy job working, never a finding; (9) outside sources for the advisor job — Anthropic/Claude release notes, the Claude Code changelog and docs, model deprecation and pricing pages, and published industry practice on agent governance and tooling, each cited by url and retrieval date.

THE SIX KINDS: duplicate (the same statement in two homes, verbatim or near), contradiction (two live statements that disagree on one governing fact — a number, a key order, a lane, who clears a flag), redundant (a default or procedure with two homes where one would do), stale-or-irrelevant (a statement in live voice that a later ship retired; a parameter the lane rejects; knowledge no capability on that agent can use; a passage kept RETIRED IN PLACE whose live twin has drifted), competing-purpose (two documents or two agents whose stated objectives claim the same decision), other (an anomaly no check names; the Development Manager reviews it like any finding, and one confirmed real three weeks running becomes a new check).

THE LEDGER: public.audit_findings, one row per finding per ISO week; the fingerprint is kind + the location homes without line numbers + the normalized governing fact, so the same finding seen next week is the same finding. Every finding also carries check_slug — the named check it failed, from the Auditor Behavior checklist, or other. A row with status not-a-defect carries the ruling (the Development Manager's, or John's) and is never re-filed. Statements whose paragraph is marked RETIRED IN PLACE or carries retirement vocabulary are history, not live voice, and are never one side of a contradiction.

THE POWERS NO RESOLUTION MAY RETIRE: B20, HR-MERGE, the 72-hour reversal window, John's Accept and Reverse, and any power the retirement ledger records as John-standing. A proposed resolution names which home should win; it never proposes removing a John-standing power.
```

### 14.3 `au-behavior` — objective and method, verbatim (task 1b; `traits` untouched)

`objective`:

```
Run the approved checklist: twenty-three named checks in five jobs, every finding naming the check it failed, where, and the evidence.
```

`method`:

```
THE CHECKLIST (AGT-86, approved by John 2026-09-23). Each line is check_slug — the test; Example: a real case found 2026-09-18..23. A check marked [code] is run by scripts/audit-board.js before you are called.

CONSISTENCY — rules and instructions that contradict each other.
rules-opposite — two live rules give opposite instructions. Example: rule MANAGER-DECIDES-BY-DEFAULT vs. runner-cycle.md step 4d "only his hand ingests and only he rules" -- both live, opposite.
rule-two-wordings — the same rule written in two places with different wording. Example: none recorded yet; the first confirmed finding becomes this line.
rule-dead-pointer — a rule points at a file, table, step or ticket that no longer exists. Example: none recorded yet; the first confirmed finding becomes this line.
rule-retired-still-followed — a rule retired but still followed. Example: none recorded yet; the first confirmed finding becomes this line.
rule-live-not-enforced — a rule live but not enforced. Example: CLAUDE-DESIGN.md's Backlog Capture rule says every backlog_items write records a runner_before_images row first; the attended backlog_items writes made in session design-ses422-0918 on 2026-09-18..22 recorded none, so they cannot be undone through reverse_decision().

BOARD HEALTH — duplicate, stale, or never-finishing tickets.
board-duplicate — two tickets ask for the same thing. Example: none recorded yet; the first confirmed finding becomes this line.
board-already-fixed — a ticket describes something already fixed. Example: none recorded yet; the first confirmed finding becomes this line.
board-stale [code] — an open ticket not revalidated for 30 days. Example: none recorded yet; the first confirmed finding becomes this line.
board-repeat-worked [code] — a ticket worked repeatedly that never closes. Example: SES-424 worked 8 cycles over ~16 hours.
board-no-home [code] — a ticket with no project/epic (invisible to prime_directive_queue). Example: SES-418..421/425/434 filed with epic_id NULL and unpickable until homed 2026-09-22.
board-deferral-undone [code] — a deferral silently undone. Example: its defer_status='yes' reset within 15 hours (SES-434).

WORK QUALITY — what got built vs. what was asked for.
quality-shipped-vs-asked — shipped work not matching the ticket's ask. Example: none recorded yet; the first confirmed finding becomes this line.
quality-closed-red [code] — a ticket closed while its checks were red. Example: none recorded yet; the first confirmed finding becomes this line.
quality-description-wrong — a ticket description found wrong once the code is read. Example: 2 of SES-422's 4 folded bugs were described wrong (SES-404/405 are one bug; SES-287's live defect differed from its ticket).
quality-safety-never-on — a safety feature built but never switched on. Example: auto-rollback built but never fires (SES-425).

FULL REVIEW — Claude's setup for DeepBench, Claude's setup for interview-questions, and DeepBench's own governance and tooling.
config-disagrees — Claude memory, CLAUDE.md files, settings, hooks and skills that disagree across DeepBench and interview-questions. Example: none recorded yet; the first confirmed finding becomes this line.
config-outdated-fact — an outdated fact (a version, scope or file path). Example: ~/.claude/projects/C--Projects-deepbench-frontend/memory/MEMORY.md describes DeepBench as "v5.1.x gov-procurement".
config-report-vs-data — a report that disagrees with the data it summarizes. Example: docs/audits/2026-W39.md reads "0 findings" while 2026-W39-candidates.json holds 34.
config-private-in-public — private information in a public repo. Example: both DeepBench repos are public.

ADVISOR — Claude, Claude Code and industry changes worth an upgrade.
advisor-feature-replaces-handbuilt — a new Claude or Claude Code feature that replaces something built by hand. Example: none recorded yet; the first confirmed finding becomes this line.
advisor-model-change — a model release, retirement or price change. Example: CLAUDE-DESIGN.md's model defaults name Opus 5 for coding while sessions now run Opus 5.5.
advisor-industry-practice — a change in industry practice for agent governance and tooling. Example: none recorded yet; the first confirmed finding becomes this line.
advisor-limit-hit — a limit repeatedly hit that an upgrade would remove. Example: DeepBench hit Vercel's 12-function Hobby-plan limit (SES-346).

THE RULES. Every finding names the check it failed (check_slug), where (file/line or table/row) and the evidence, quoted verbatim. An anomaly no check names is kind other with check_slug other. A [code] check's findings arrive in your task_context already judged: read them for context, never re-judge, re-file or drop them. Dates, counts and ids are code's to state; you are used only where judgment is needed.
```

### 14.4 The four `capabilities` rows, verbatim (task 1c; `execution_type ai`, `tenant_id global`)

| slug | name | default_intent_slug | display_phrase | description |
|---|---|---|---|---|
| `audit-board-health` | `Audit Board Health` | `au-board-intent` | `auditing the board's health` | `Reviews the ticket board for two tickets asking for the same thing and for tickets describing something already fixed, reading the deterministic board checks (stale, repeat-worked, no home, deferral undone) as already-judged context. Returns findings with verbatim locations and a proposed resolution; writes nothing itself.` |
| `audit-work-quality` | `Audit Work Quality` | `au-quality-intent` | `auditing the work's quality` | `Reviews shipped tickets against their own text: work that does not deliver what was asked, descriptions the code contradicts, and safety features built but never switched on. Returns findings with verbatim locations and a proposed resolution; writes nothing itself.` |
| `audit-config-review` | `Audit Configuration Review` | `au-config-intent` | `reviewing the Claude configuration` | `Reviews Claude's configuration for DeepBench and for interview-questions — memory, CLAUDE files, settings, hooks, skills — and the reports they carry, for homes that disagree, outdated facts, reports that contradict their data, and private information in a public repo. Returns findings with verbatim locations and a proposed resolution; writes nothing itself.` |
| `audit-advisor` | `Audit Advisor` | `au-advisor-intent` | `advising on Claude and industry changes` | `Reads Anthropic and Claude Code release notes, model and pricing pages and published practice on agent governance, and compares them with what DeepBench runs today: a feature that replaces a hand-built mechanism, a model change, a practice change, or a limit hit that an upgrade would remove. Returns findings with cited sources and a proposed upgrade; writes nothing and spends nothing itself.` |

### 14.5 The four Intent rows, verbatim (task 1d)

Common to all four: `skill_type_slug intent`, `execution_type ai`, `tenant_id NULL`, `llm_provider anthropic`, `llm_model claude-fable-5-1`, `max_tokens 6000`, `temperature NULL`, `api_key_source platform`, `guardrails {"must":[],"must_not":[]}` — read off `au-corpus-intent` at write time. `technical_services ["structured-output"]` for board/quality/config; `["structured-output","web-search"]` for advisor.

**SHARED TRAITS** (byte-for-byte the `traits` of `au-board-intent`, `au-quality-intent`, `au-config-intent`):

```json
{"schema":{"type":"object","required":["cluster","findings","account"],"properties":{"account":{"type":"string","maxLength":100},"cluster":{"type":"string"},"findings":{"type":"array","items":{"type":"object","required":["kind","check_slug","locations","governing_fact","confidence","proposed_resolution"],"properties":{"kind":{"enum":["duplicate","contradiction","redundant","stale-or-irrelevant","competing-purpose","other"],"type":"string"},"check_slug":{"type":"string","pattern":"^[a-z][a-z0-9-]{2,60}$"},"locations":{"type":"array","items":{"type":"object","required":["location","text"],"properties":{"text":{"type":"string"},"location":{"type":"string"}}},"minItems":1},"confidence":{"enum":["high","medium","low"],"type":"string"},"governing_fact":{"type":"string","maxLength":300},"proposed_resolution":{"type":"string","maxLength":400}}}}}},"handler":"auditor-write","can_request_help":false}
```

**`au-board-intent`** — name `Audit Board Health`; objective:

```
Judge one week's board for duplicate tickets and tickets already fixed, and return every finding it supports with its check_slug.
```

method:

```
Your task_context carries week (the ISO week), board (open and recently closed backlog_items rows: backlog_id, title, description, status, epic_id, project, tier, priority_class, defer_status, filed_at, revalidated_at, delivered_at), code_findings (the findings scripts/audit-board.js already produced for board-stale, board-repeat-worked, board-no-home, board-deferral-undone and quality-closed-red — already judged, never re-filed) and prior (the fingerprints already in the ledger for this week). Judge only the two board checks code cannot: board-duplicate (two rows ask for the same thing — quote both titles or descriptions) and board-already-fixed (a row describes something a later ship, decision or verdict shows is done — quote the row and the evidence). Every finding: kind, check_slug, the locations as backlog_items:<ID> with the quoted text verbatim, governing_fact, confidence, proposed_resolution naming which row should survive or close. Return an empty findings array when the board supports none.
```

**`au-quality-intent`** — name `Audit Work Quality`; objective:

```
Judge one week's shipped tickets against their own text and return every finding it supports with its check_slug.
```

method:

```
Your task_context carries week, shipped (tickets delivered or done in the window: backlog_id, title, description, kickoff_path, ship_summary, verdict with its gates, commits with changed files), code_findings (quality-closed-red from scripts/audit-board.js — already judged, never re-filed) and prior (the fingerprints already in the ledger for this week). Judge the three quality checks code cannot: quality-shipped-vs-asked (the changed files and ship summary do not deliver a sentence of the ticket's own text — quote the sentence and the evidence), quality-description-wrong (the description states a defect or mechanism the code or the record contradicts — quote both), quality-safety-never-on (a guard, rollback, flag or gate the record shows built but never enabled or never fired — quote where it is built and where it should have fired). Every finding: kind, check_slug, locations verbatim (backlog_items:<ID>, a file:line, or a table/row), governing_fact, confidence, proposed_resolution. Return an empty findings array when the window supports none.
```

**`au-config-intent`** — name `Audit Configuration Review`; objective:

```
Compare one topic cluster of configuration statements across both projects and Claude's local setup, and return every finding it supports with its check_slug.
```

method:

```
Your task_context carries cluster (a topic label), statements (an array of {id, source, location, text, retired}) drawn from the deepbench-frontend repo's CLAUDE*.md, .claude/ and docs, the interviewquestions repo's CLAUDE.md, .claude/ and docs, and the claude-config mirror (memory/<folder>/**, user/settings.json, projects-root/CLAUDE.md, projects-root/.claude/settings*.json and hooks/**, interviewquestions/.claude/**), repo_visibility (each repo's public or private state as measured) and prior (the fingerprints already in the ledger for this week). For the cluster judge the four full-review checks: config-disagrees (two homes give different instructions or facts for the same thing, across the two projects or between memory and a CLAUDE file — quote both), config-outdated-fact (a version, scope, path or status a live source shows has moved on — the statement is the location, the live source is the governing fact), config-report-vs-data (a report, brief or summary whose numbers disagree with the data it summarizes — quote both), config-private-in-public (a secret, personal detail or private path in a repo repo_visibility says is public; a <REDACTED:kind> marker is the copy job working, never a finding). Every finding: kind, check_slug, the locations verbatim, governing_fact, confidence, proposed_resolution naming which home should win. Skip any statement with retired true as a side of a contradiction. Return an empty findings array when the cluster supports none.
```

**`au-advisor-intent`** — name `Audit Advisor`; objective:

```
Compare what Anthropic, Claude Code and the field have changed with what DeepBench runs today, and return every upgrade the evidence supports with its check_slug.
```

method:

```
Your task_context carries week, platform_facts (what DeepBench runs today: runner_model_lanes rows, the model defaults CLAUDE-DESIGN.md names, the Vercel plan and function count, the token caps, and the hand-built mechanisms listed with their file paths), limits_hit (refusals and walls recorded in the window: runner_cycles outcomes, runner_settings walls, deploy failures), prior (the fingerprints already in the ledger for this week) and, when the caller supplies them, sources (fetched pages: url, retrieved_at, text). You may search and read Anthropic/Claude release notes, the Claude Code changelog and docs, model deprecation and pricing pages, and published practice on agent governance and tooling; cite every outside claim by its url and retrieval date in the location text. Judge the four advisor checks: advisor-feature-replaces-handbuilt (a shipped Claude or Claude Code feature does what a named hand-built mechanism does — quote the release note and the file), advisor-model-change (a model release, retirement or price change touches a model DeepBench names — quote the page and the row or line), advisor-industry-practice (a published practice DeepBench's governance or tooling lacks or contradicts — quote both), advisor-limit-hit (a limit hit more than once in the window that a plan, model or feature upgrade would remove — quote the hits). Every finding: kind (other unless a statement literally contradicts or duplicates another), check_slug, the locations verbatim, governing_fact, confidence, proposed_resolution stating the upgrade and whether it costs money — a money call is John's, say so and never assume it. Return an empty findings array when nothing changed.
```

`au-advisor-intent` traits (SHARED TRAITS plus the two web-search keys `db-assembly.js:333/:342` read):

```json
{"schema":{"type":"object","required":["cluster","findings","account"],"properties":{"account":{"type":"string","maxLength":100},"cluster":{"type":"string"},"findings":{"type":"array","items":{"type":"object","required":["kind","check_slug","locations","governing_fact","confidence","proposed_resolution"],"properties":{"kind":{"enum":["duplicate","contradiction","redundant","stale-or-irrelevant","competing-purpose","other"],"type":"string"},"check_slug":{"type":"string","pattern":"^[a-z][a-z0-9-]{2,60}$"},"locations":{"type":"array","items":{"type":"object","required":["location","text"],"properties":{"text":{"type":"string"},"location":{"type":"string"}}},"minItems":1},"confidence":{"enum":["high","medium","low"],"type":"string"},"governing_fact":{"type":"string","maxLength":300},"proposed_resolution":{"type":"string","maxLength":400}}}}}},"handler":"auditor-write","can_request_help":false,"enable_web_search":true,"web_search_max_uses":8}
```

On the session lane `agent-prompt.js` makes no model call and attaches no tool; the two keys bind only the executor/MCP path. A session running the advisor uses its own web tools and cites the same way.

### 14.6 The decision text (task 1)

summary: `AGT-86 slice 7: the Auditor's checklist (23 checks in 5 jobs) in au-behavior, nine homes and the sixth kind in au-knowledge-homes, four capabilities with their Intent rows, assignments and links`. reasoning: `Approved matrix AGT-86 §3 written as named checks with slugs so every finding names the check it failed; deterministic slugs match scripts/audit-board.js (slice 4); web search bound on au-advisor-intent only; identity and guardrails untouched (AGT-67, §11(5)). pattern:2 pattern:7 pattern:17 pattern:53 pattern:90 pattern:136`.

### 14.7 `au-guardrails` control lists (test arm E, verbatim)

`must`: `["quote every location verbatim from the statement handed to you, never a paraphrase","name exactly one governing fact per finding","name which home should win in every proposed resolution and cite the ledger entry or decision that makes it true","treat any statement marked retired as history, never as one side of a contradiction","return an empty findings array rather than a weak finding"]`

`must_not`: `["edit, certify, resolve or close anything — you file","propose a resolution that retires B20, HR-MERGE, the reversal window, or any John-standing power","re-file a finding whose fingerprint is in prior with a not-a-defect ruling","write to any table directly — the auditor-write handler is the only writer","name a specific agent as the cause; name the row and the field"]`

### 14.8 Alternatives considered

- **Edit `au-guardrails` to add "never re-judge a [code] finding".** Rejected: guardrails are the Auditor's hard limits and go to John (§11(5), AGT-67); the rule lives in Behavior, where the Development Manager may later tighten it.
- **One new capability `audit-weekly` instead of four.** Rejected by the ticket's own words ("Add a new Intent (and capability) per job") and by §19b: each job has its own task_context shape, and the routine's playbook (slice 8) sequences them.
- **Rewrite `au-behavior.traits`.** Left as is: `reasoning_style` ("one topic cluster at a time") still governs the two corpus intents; the four new intents carry their own procedure. Touching traits would widen the edit past what the ticket names (pattern:90).
- **Pin `au-identity`/`au-guardrails` by copying their before-images.** No image exists because they are not written; the test pins md5(objective)/md5(method) for identity, the two guardrail arrays verbatim, and the absence of any session image on their ids — which fails if the build writes either row, and passes if it does not.
- **Model for the build.** Orchestrator lane `claude-opus-5`: one 34-image transaction on a governance agent's rows and a credentialed test; a wrong `pk_value` or a missed image is an undoable-in-name-only edit (pattern:125).

### 14.9 What slice 7 does not do

No routine exists (slice 8); nothing gathers board, shipped-work, config or outside-source statements for the four intents (slices 4, 5, 6); no finding is filed; `scripts/audit-cluster.js`'s `capabilityFor()` still routes only the two corpus capabilities. `au-identity`, `au-guardrails`, `au-corpus-intent`, `au-agent-data-intent` are byte-identical after the ship.

### 14.10 Patterns applied (7)

pattern:2 (the checklist is rows, not code), pattern:7 (behavior in the agent's own Skill), pattern:8 (data-level change, no harness edit), pattern:9 (deterministic checks stay code; the model only judges), pattern:17 (extend the five-link shape, `record_decision`, `runner_before_images`), pattern:53 (slice 4's slugs reused, one name per check), pattern:64/66 (one slice, minimum useful), pattern:90 (John's matrix and examples verbatim), pattern:92 (verbatim rows in the harvest for a cold builder), pattern:136 (Skill types named), pattern:162 (every arm has a pre-change red or a stated control), pattern:164 (no service key in `.env.local`; web-search trait facts measured), pattern:168 (kickoff 8,179 bytes).

## 13. Slice 6 — the full review reads the new places: `--extra-root` and the private-info scan (kickoff `docs/kickoffs/v7.0.550-AGT-86-s6-full-review-roots.md`, 2026-09-23)

**Premise (alive, measured 2026-09-23).** `scripts/audit-corpus.js` reads one repo: `corpusFiles()` (:535-546) enumerates CLAUDE*.md, SELFBUILD-CHARTER, GOVERNANCE-MODES, ARCHITECTURE, RUNNER-GOV-*, docs/runbooks, .claude/rules, then main() adds `.claude/settings.json`, `vercel.json`, `ci.yml` and every `scripts/*.js` header. `--corpus=<dir>` (:741-750) REPLACES the file half; there is no additive root and no private-info detector anywhere in the tree (`grep extra-root|private-scan` = 0 hits). AGT-86 §3(4) names Claude memory, the interview-questions setup and "private information in public repos" as checks the review must run; none can run today.

**Why two mechanisms, one slice.** Both are the CODE layer of AGT-86 §7 (§19b: no route, no agent in data) and both are deterministic (AGT-86 §10, pattern:9). They fit 3 files / 4 tasks without a 6a/6b split: `audit-corpus.js` (roots + the `--private-scan` hook), a new `scripts/audit-private-scan.js`, and the test. The scan lives in its own module rather than inside the 44 KB corpus script (pattern:15 — it is one seam, secrets-in-public, and the claude-config copy job already owns the same detector table; the two tables are sibling copies of one regex list, noted for a later share when the private repo can be imported, which it cannot be from this public one).

**Design choices.**
- *Roots are flags.* `--extra-root=<label>=<dir>`, repeatable; the routine (slice 8) passes `claude-config=<clone>` and `interviewquestions=<clone>`. A Claude Code cloud routine clones each attached source side by side; the design reads only that far and hard-codes no path (environment fact 2026-09-15: laptop paths die in the cloud clone).
- *Additive, never replacing.* `walkRoot()` appends after the normal or `--corpus` half. Location `"<label>:<rel>:<line>"` keeps `locationKey()` (audit-ledger.js:140) working unchanged — it strips only the trailing `:<n>`. The statement gains `project: <label>` so a cluster can say "memory file vs CLAUDE.md vs governance rule" across projects; this repo's statements carry no `project` key, which the ledger ignores.
- *Missing root = exit 2.* Same contract as `--corpus` with no .md files (:745): could-not-run is never a clean pass.
- *Summary line untouched.* agt-70-auditor.test.mjs :1360 parses `statements N (…) duplicates d stale s` as a BAND; per-root counts print on their own lines.
- *Private scan over what is public.* The file set is `git ls-files` — what is committed is what is public — never the working tree, and never the extra roots (claude-config is private by construction; scanning it would file its own contents as leaks).
- *Detector table.* Copied from `C:/Projects/claude-config/sync.mjs:21-40` (pem, sk-ant, sk-, sb_secret_, gh*/github_pat_, JWT, AKIA/ASIA, vercel bypass header + prose forms, generic KEY|TOKEN|SECRET|PASSWORD|BYPASS assignment) plus two of the ticket's own: personal e-mail (personal-mail domains only, never `noreply@`) and personal absolute paths.
- *The generic-assignment rule is tightened from the measurement.* The raw sync.mjs regex hit 19 lines here; 15 are false positives (`.env.example` placeholders, `GOVERNANCE_KEY_HEADER = 'x-deepbench-mcp-key'`, `DECISIVE_KEYS = Object.freeze([`, `ROUTING_TOKENS = …`, a prose "KEY: the Intent return"). The live bypass value is 32 mixed-case letters with no digit, so "value must contain a digit" would miss it. Rule: a name carrying BYPASS|SECRET|PASSWORD flags any 16+ token; a name carrying only KEY|TOKEN also needs a digit in the value. That keeps the 4 `BYPASS = '…'` kickoff lines and drops all 15 false positives.
- *Allowlist with reasons, not silent skips.* `SUPABASE_URL`; `sb_publishable_` (the publishable key ships in the browser bundle by design); `your_*_here`, `…`, `<…>` placeholders; identifier values and `env.`/`process.env.`/`${` references. `sb_publishable_` and anon JWTs are 0 in the tree today, so the allowlist is a fixture-proven rule (arm C), not a live exemption.
- *Aggregation.* Same rule as slice 4: over 25 hits of one detector → one finding at the stable location `audit-private/<detector>` so `fingerprint()` (kind | sorted locationKeys | governing_fact) holds week to week and the escalate rule can fire. `AGGREGATE_OVER = 25` is declared locally because `scripts/audit-board.js` (slice 4) is designed but not built (pattern:68); sharing the constant is a one-line follow-up once both exist.
- *Never print the secret.* Finding text masks the value to 4 chars + `****`; stdout carries counts only. The scan's job is to report that a leak exists, not to copy it into the ledger.

**Live measurement (1,626 tracked files).** sk-ant / sb_secret / gh* / JWT / AKIA: 0. `x-vercel-protection-bypass` with the literal value: 44 lines / 42 files (docs/kickoffs, docs/runbooks, a few scripts/tests) — this is the real deployment-protection bypass secret sitting in a PUBLIC repo, and it is the scan's first real finding; John already knows both repos are public (AGT-86 §3(4) example). 6 further header lines carry identifiers (`BYPASS_SECRET`, `env.VERCEL_AUTOMATION_BYPASS_SECRET`) — references, not values. E-mail: 1,289 lines / 117 files, all City of Austin public-record vendor addresses in the procurement fixtures; personal-mail domains: 1 line in `public/Austin_2025Data_.csv` (a vendor contact at a personal domain inside a public dataset — left to the Development Manager's ruling, which the ledger then remembers; not allowlisted by hand, pattern:98). Personal paths: 5 lines / 4 files (`DeepBench-Session-Init.md:196`, `docs/harvests/SES-90.md:102`, `docs/vision/evidence-sources.md:40,48`, `docs/kickoffs/v7.0.63-…:12`). Expected first run: 1 aggregate vercel_bypass finding (44 lines), 4 secret_assignment findings (per row), 1 personal_email, 5 personal_path — 11 findings, `check_slug` `config-private-in-public`, kind `other`.

**What this slice does not do.** It does not fix the bypass leak (that is a Development Manager ticket from the first review — rotating the Vercel secret is John's infrastructure, and the 42 files are history docs). It does not read the roots from the routine (slice 8), does not put the check into the Auditor's skill rows (slice 7), does not ingest (slice 3; `toRow()` still drops `check_slug`, slice 3's concern), and never edits claude-config or interviewquestions.

**Baseline.** `node scripts/baseline-red-set.js --tests=tests/regression/agt-70-auditor.test.mjs --worktree=<worktree>` → agt-70-auditor green, red set 0 of 1; the new test file is absent (the script refuses a non-existent path rather than measuring it). The 12 inherited suite reds from the coordinator's note stand.

**Patterns applied.** pattern:9 (deterministic, no model call), pattern:15 (one module owns the seam), pattern:17 (extend `--corpus`'s script rather than a parallel scanner), pattern:38 (the scan counts everything committed, no convenient scope filter), pattern:68 (local constant over a dependency not yet built), pattern:98 (the Austin personal-domain hit goes to the reviewer, not a hand allowlist), pattern:162 (the test grades fixtures; the live arm asserts existence, not the world's count), pattern:164 (cloud clone layout read from environment facts).

## 16. Slice 9 — the learning loop: 9a the scorecard view and the tighten/promote flags (kickoff `docs/kickoffs/v7.0.553-AGT-86-s9a-check-scorecard.md`, 2026-09-23); 9b the checklist edits (specified in §16.5, next kickoff)

### 16.1 Premise revalidated

Measured live on `rallojeqnkgtxgsdsnqm` 2026-09-23 against tree `9495d45a` (origin/dev with 2a `v7.0.546`, 2b `v7.0.548`, 3 `v7.0.549` and 4 `v7.0.547` shipped):

| Fact | Measurement |
|---|---|
| `audit_findings` | 65 rows: W37 4 `open` + 2 `resolved`, W38 25 `open`, W39 34 `open`; `ruled_by` set on 2 (the resolved pair); `check_slug` NULL on all 65 (slice 3's ingest carries no slug; the candidates files have none); 0 rows `kind 'other'`; max distinct `iso_week` per fingerprint 3 (the four W37 fingerprints) |
| `audit_check_scorecard` | absent from `pg_views`; no file in the tree names it |
| Default ACL | `pg_default_acl` for relations (`r`) grants `anon` and `authenticated` `arwdDxtm` from both `postgres` and `supabase_admin` — SES-384's fact holds for views too; `ticket_outcome` (the newest view) carries grants for `postgres` and `service_role` only, the revoked shape to copy |
| `apply_audit_review(uuid, text, text, jsonb)` | 1 `pg_proc` row; body = §9.3 as shipped: p_week, attribution, groups non-empty, per-group rules (kind, finding_ids, carry/reason/weeks_seen, not-a-defect/reason, escalate/john_call+summary, root-cause fields or reuse row, ≤ 1 cleanup with fix), then coverage; `record_decision(… 'filing' …)`; images `to_jsonb(f)` per finding under `v_dec`; `john_alerts` per escalation; `recompute_backlog_queue()`; returns `{decision_id, tickets, counts}`. `p_review -> 'checklist_edits'` is never read |
| `reversible_tables()` | 15 names incl `skill_profiles`; `reverse_decision()` (`p_decision, p_actor, p_reason, p_actor_cycle DEFAULT NULL`) restores an image whole-row via `jsonb_populate_record` (`update … set (cols) = (select … )` at its `:348`), deletes on a NULL image (`:336`) |
| `runner_before_images` on `skill_profiles` | 41 rows with `row_data` non-null; the newest under decision `decbb801-5f99-4b85-a406-f29d1be0fcab` (session `agt-86-auditor-0923`, slice 7) images `13d78538-02d1-4f97-b875-ff71bd7dfe50` = `au-knowledge-homes` — the UPDATE-image shape 9b copies |
| `skill_profiles` `au-*` rows | `au-identity c9e7a0f2-3a87-48e7-9e04-f7c56b53280f`, `au-guardrails 1e1adf86-2700-4c44-bd67-30546fb3da01`, `au-behavior 47e8bc5a-8b0b-49aa-b4bf-2a386d94ea0b`, `au-knowledge-homes 13d78538-02d1-4f97-b875-ff71bd7dfe50`, intents `au-corpus-intent`, `au-agent-data-intent`, `au-board-intent`, `au-quality-intent`, `au-config-intent`, `au-advisor-intent` (all `skill_type_slug intent`) |
| `dm-audit-review-intent` | id `a6d3568f-3a39-44ff-a2b9-0aa62035281e`, `llm_model claude-opus-5`, `tenant_id NULL`; `method` 1,562 chars (§9.2 verbatim, no tighten/promote rule); `traits.schema.required` = `[groups, summary_for_john, patterns_applied]`, no `checklist_edits` property; linked to `review-audit-worklist` at `display_order` 4 of 6 |
| `scripts/audit-review.js` (2b, `v7.0.548`) | pure half exports `JOHN_CALLS, KINDS, WEEK_RE, NOTHING_TO_REVIEW, buildTaskContext, validateReview`; `--prepare` GETs `audit_findings?status=in.(open,carried)…`, `audit_findings?select=fingerprint,iso_week,status,ruling,ruled_by` and `backlog_items?source_file=eq.audit-review…`; context keys `week, worklist, open_audit_tickets, john_calls` |
| `runner_model_lanes` | orchestrator `claude-opus-5`, judgment `claude-fable-5-1`, mechanical `claude-sonnet-5` |
| Baseline | `node scripts/baseline-red-set.js --tests=tests/regression/agt-86i-learning-loop.test.mjs` → "these paths do not exist, so no baseline was measured" |

Premise alive: nothing scores a check, nothing flags a false-alarm-prone check or a recurring `other`, and the manager's answer contract has no place for a checklist edit. To date the loop has learned nothing (AGT-86 §11) and still cannot.

**Why 9a / 9b.** The ticket's scope is one migration (view + function), the intent row, the script and the test. As one kickoff the seven sections measured 9,645 bytes after two compressions — over the 8,192 cap with task facts still in it (pattern:168), and the cap on files/tasks is at its limit. The ticket itself names the seam: 9a = the scorecard view, the two pure flag functions and the prepare context (the manager SEES); 9b = `checklist_edits` in `apply_audit_review()`, the allowlist, the before-image, the intent row's two rules (the manager ACTS). 9b's kickoff is short because §16.5 holds the function spec and §16.2/§16.3 hold the row text. Not a waiver of the cap (pattern:72) — a split the ticket offered.

### 16.2 `dm-audit-review-intent.method` — the addition, verbatim (9b task 1 appends this after the existing method, separated by one space)

```
THE LEARNING LOOP (AGT-86 section 11). Your task_context also carries scorecard (checks: per check_slug and week — found, real, false_alarm, carried, rulings, rulings_3w, false_alarm_rate_3w — only checks with three or more rulings; tighten: the check_slugs whose false-alarm rate is 50% or more over their last three weeks), promotions (fingerprints of kind other ruled real — ticketed or escalated — in three distinct weeks, each with its finding_ids: a check waiting to be named), and checklist (the audit checklist rows you may edit: au-behavior, au-knowledge-homes and the au-*-intent rows, each with its objective and method as they read today). Two rules. TIGHTEN: a check in tighten gets its line in au-behavior's method rewritten so the false alarms it raised would no longer pass it — narrow the test, name the exception, or add the evidence it must quote; never delete a check. PROMOTE: a promotion becomes a new named check — add a line to au-behavior's method under the job it belongs to, with a slug, the test and the example taken from the findings themselves, and add that slug to the au-*-intent row whose task_context would carry it. An advisor finding ruled real may add a check the same way. Return every edit in checklist_edits: skill_slug, field (method or objective), new_text (the WHOLE field as it should read after the edit, never a fragment), reason (the finding ids and the rule — tighten or promote — behind it). Edits to au-identity and au-guardrails are refused: who the audit is and its hard limits are John's; put such a change in summary_for_john instead. A checklist edit is recorded under the same reversible decision as your rulings, so make one only when the scorecard or a promotion supports it — an empty checklist_edits is the normal answer.
```

### 16.3 `dm-audit-review-intent.traits.schema.properties.checklist_edits` — verbatim (9b task 1; `required` stays `[groups, summary_for_john, patterns_applied]`)

```json
{"type":"array","items":{"type":"object","required":["skill_slug","field","new_text","reason"],"properties":{"skill_slug":{"type":"string","pattern":"^au-(behavior|knowledge-homes|[a-z-]+-intent)$"},"field":{"type":"string","enum":["method","objective"]},"new_text":{"type":"string","minLength":1,"maxLength":12000},"reason":{"type":"string","maxLength":600}}},"description":"Edits to the audit checklist rows the manager owns; au-identity and au-guardrails are John's and are refused. Each edit is imaged and reversible under this review's decision."}
```

### 16.4 Migration `agt86_s9a_check_scorecard` — verbatim (9a task 1)

```sql
CREATE VIEW public.audit_check_scorecard AS
WITH w AS (
  SELECT check_slug, iso_week,
         count(*)::int                                                                   AS found,
         count(*) FILTER (WHERE status IN ('ticketed','escalated','resolved'))::int      AS "real",
         count(*) FILTER (WHERE status = 'not-a-defect')::int                            AS false_alarm,
         count(*) FILTER (WHERE status = 'carried')::int                                 AS carried
    FROM public.audit_findings
   WHERE check_slug IS NOT NULL
   GROUP BY check_slug, iso_week
)
SELECT check_slug, iso_week, found, "real", false_alarm, carried,
       ("real" + false_alarm)::int                                                       AS rulings,
       (sum("real" + false_alarm) OVER w3)::int                                          AS rulings_3w,
       round((sum(false_alarm) OVER w3)::numeric / nullif(sum("real" + false_alarm) OVER w3, 0), 2) AS false_alarm_rate_3w
  FROM w
WINDOW w3 AS (PARTITION BY check_slug ORDER BY iso_week ROWS BETWEEN 2 PRECEDING AND CURRENT ROW);

COMMENT ON VIEW public.audit_check_scorecard IS 'AGT-86 section 11: per-check scorecard of the audit ledger. One row per check_slug and ISO week. real = ticketed + escalated + resolved, false_alarm = not-a-defect, a carry is not a ruling; rulings_3w and false_alarm_rate_3w run over the check''s last three rows by iso_week. Read by scripts/audit-review.js --prepare; service_role only.';

REVOKE ALL ON public.audit_check_scorecard FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.audit_check_scorecard TO service_role;

DO $$
DECLARE
  n int; a numeric; b numeric; ra int; rb int; pre int;
BEGIN
  IF to_regclass('public.audit_check_scorecard') IS NULL THEN RAISE EXCEPTION 'AGT86I: view missing'; END IF;
  SELECT count(*) INTO n FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name = 'audit_check_scorecard' AND grantee IN ('anon','authenticated');
  IF n <> 0 THEN RAISE EXCEPTION 'AGT86I: % grants to anon/authenticated on the view', n; END IF;
  IF NOT has_table_privilege('service_role', 'public.audit_check_scorecard', 'SELECT') THEN RAISE EXCEPTION 'AGT86I: service_role cannot read the view'; END IF;
  SELECT count(*) INTO pre FROM public.audit_findings;
  BEGIN
    INSERT INTO public.audit_findings (fingerprint, iso_week, kind, check_slug, locations, governing_fact, confidence, proposed_resolution, status, found_by) VALUES
      ('agt86qa-a', '2026-W01', 'other', 'agt86qa-a', '[{"location":"qa"}]', 'qa', 'low', 'qa', 'not-a-defect', 'agt-86-qa'),
      ('agt86qa-a', '2026-W02', 'other', 'agt86qa-a', '[{"location":"qa"}]', 'qa', 'low', 'qa', 'not-a-defect', 'agt-86-qa'),
      ('agt86qa-a', '2026-W03', 'other', 'agt86qa-a', '[{"location":"qa"}]', 'qa', 'low', 'qa', 'ticketed',     'agt-86-qa'),
      ('agt86qa-b', '2026-W01', 'other', 'agt86qa-b', '[{"location":"qa"}]', 'qa', 'low', 'qa', 'not-a-defect', 'agt-86-qa'),
      ('agt86qa-b', '2026-W02', 'other', 'agt86qa-b', '[{"location":"qa"}]', 'qa', 'low', 'qa', 'ticketed',     'agt-86-qa'),
      ('agt86qa-b', '2026-W03', 'other', 'agt86qa-b', '[{"location":"qa"}]', 'qa', 'low', 'qa', 'ticketed',     'agt-86-qa');
    SELECT count(*) INTO n FROM public.audit_check_scorecard WHERE check_slug IN ('agt86qa-a','agt86qa-b');
    SELECT rulings_3w, false_alarm_rate_3w INTO ra, a FROM public.audit_check_scorecard WHERE check_slug = 'agt86qa-a' AND iso_week = '2026-W03';
    SELECT rulings_3w, false_alarm_rate_3w INTO rb, b FROM public.audit_check_scorecard WHERE check_slug = 'agt86qa-b' AND iso_week = '2026-W03';
    IF n <> 6 OR ra <> 3 OR rb <> 3 OR a <> 0.67 OR b <> 0.33 THEN
      RAISE EXCEPTION 'AGT86I_BAD: rows % a(% %) b(% %)', n, ra, a, rb, b;
    END IF;
    RAISE EXCEPTION 'AGT86I_OK';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'AGT86I_OK' THEN RAISE; END IF;
  END;
  SELECT count(*) INTO n FROM public.audit_findings;
  IF n <> pre THEN RAISE EXCEPTION 'AGT86I: fixtures leaked (% -> %)', pre, n; END IF;
  SELECT count(*) INTO n FROM public.audit_check_scorecard WHERE check_slug LIKE 'agt86qa-%';
  IF n <> 0 THEN RAISE EXCEPTION 'AGT86I: view still shows fixtures'; END IF;
END $$;
```

`rulings 1` on each W03 row (one finding per week per check); `found` and `carried` are asserted by the test's F arm on view-shaped rows, not here. The `RAISE 'AGT86I_OK'` is the roll-back: a sub-block's exception discards its own writes, the outer handler swallows that one message and re-raises anything else (the 2a `weeks_seen` shape).

### 16.5 Slice 9b — checklist edits as reversible decisions (next kickoff; 3 files: migration `agt86_s9b_checklist_edits`, `scripts/audit-review.js`, `tests/regression/agt-86i-learning-loop.test.mjs`; the intent row is data; 4 tasks: intent row, down + migration, script + test arms, close-out; model `claude-opus-5`, orchestrator lane; lanes session only, $0)

1. **Intent row, one `DO` block (3d):** `record_decision(NULL, 'agt-86-auditor-0923', 'agent-row', 'AGT-86', 'AGT-86 slice 9b: dm-audit-review-intent learns tighten, promote and checklist_edits', '<reasoning> pattern:2 pattern:7 pattern:16 pattern:136', ladder_work_class('P10 - Tooling'))`; one image `(NULL, 'agt-86-auditor-0923', 'skill_profiles', 'a6d3568f-3a39-44ff-a2b9-0aa62035281e', to_jsonb(row), decision)` taken BEFORE; then `UPDATE skill_profiles SET method = method || ' ' || <§16.2>, traits = jsonb_set(traits, '{schema,properties,checklist_edits}', <§16.3>) WHERE slug = 'dm-audit-review-intent'`. Skill type (pattern:136): still the Intent row — the loop is procedure and output contract for the same capability, not new identity or knowledge.
2. **Down:** `capture_migration_down('386e52e6-08ae-4bf6-ad3d-5944882fb8ff', 'agt86_s9b_checklist_edits', '[{"kind":"function","identity":"public.apply_audit_review(uuid, text, text, jsonb)"}]'::jsonb)` → `auto-downable` with the prior definition captured (1 overload).
3. **Function:** `CREATE OR REPLACE FUNCTION public.apply_audit_review(...)` — same identity, the §9.3 body kept verbatim, plus: `v_edits jsonb := p_review -> 'checklist_edits'` (NULL or absent = no edits; if present and not an array → `RAISE 'apply_audit_review: checklist_edits must be an array'`). Validation placed AFTER the per-group loop (1a) and BEFORE coverage (1b), per edit `e`: (i) `e ->> 'skill_slug' !~ '^au-(behavior|knowledge-homes|[a-z-]+-intent)$'` → `RAISE 'apply_audit_review: checklist edit to % refused: only au-behavior, au-knowledge-homes and au-*-intent rows are the manager''s; au-identity and au-guardrails are John''s (AGT-86 section 11(5))', e ->> 'skill_slug'`; (ii) no `skill_profiles` row with that slug → `'apply_audit_review: checklist edit names no skill_profiles row %'`; (iii) `field` not in (`method`, `objective`) → `'apply_audit_review: checklist edit field % must be method or objective'`; (iv) blank `new_text` or `reason` → `'apply_audit_review: checklist edit to % needs new_text and reason'`. Decision reasoning: one line per edit `checklist-edit <slug>.<field>: <reason>` appended to `v_group_lines`. Write, after step 5 (alerts) and before step 6: per edit `INSERT INTO runner_before_images (cycle_id, session_name, table_name, pk_value, row_data, decision_id) SELECT p_cycle_id, p_session_name, 'skill_profiles', sp.id::text, to_jsonb(sp), v_dec FROM skill_profiles sp WHERE sp.slug = <slug>`; then `UPDATE public.skill_profiles SET method = <new_text> WHERE slug = <slug>` (or `objective`); `counts` gains `'checklist_edits', <n>`. Grants re-stated exactly as §9.3. Trailing `DO`: `pg_proc` count 1; `prosrc ~ 'checklist_edits'`; EXECUTE false for anon/authenticated, true for service_role; sub-block (rolled back with `RAISE 'AGT86I_OK'`): INSERT one finding (`agt86i-fix`, `2026-W01`, `kind 'other'`, `found_by 'agt-86-qa'`), build `ids` = every `audit_findings.id` with status in (`open`,`carried`) (now including the fixture), call `apply_audit_review(NULL, 'agt-86-qa', '2026-W03', jsonb_build_object('groups', jsonb_build_array(jsonb_build_object('kind','not-a-defect','reason','qa','finding_ids', ids)), 'summary_for_john','qa', 'patterns_applied','[]'::jsonb, 'checklist_edits', jsonb_build_array(jsonb_build_object('skill_slug','au-knowledge-homes','field','objective','new_text','agt86i qa','reason','qa'))))` into `r`; assert `(select count(*) from runner_before_images where decision_id = (r->>'decision_id')::uuid and table_name = 'skill_profiles' and row_data->>'slug' = 'au-knowledge-homes') = 1`, `(select objective from skill_profiles where slug = 'au-knowledge-homes') = 'agt86i qa'`, `r->'counts'->>'checklist_edits' = '1'`; then `RAISE 'AGT86I_OK'`. After the block: `audit_findings` at its pre-count, `au-knowledge-homes.objective` byte-identical to before, `runner_decisions` count unchanged. A second sub-block proves the refusal: the same call with `skill_slug 'au-identity'` passes only on `SQLERRM ~ 'John'` and leaves `au-identity` untouched.
4. **`scripts/audit-review.js`:** export `EDITABLE_SLUG = /^au-(behavior|knowledge-homes|[a-z-]+-intent)$/`; `validateReview` gains the four edit refusals with the same texts (minus the `apply_audit_review: ` prefix) in the same place — after the group loop, before coverage; `buildTaskContext({…, profiles})` adds `checklist: profiles.filter(p => EDITABLE_SLUG.test(p.slug)).map(p => ({skill_slug: p.slug, objective: p.objective, method: p.method}))`; `--prepare` GETs `skill_profiles?slug=like.au-*&select=slug,objective,method&order=slug`; `--apply` sends `checklist_edits: answer.checklist_edits ?? []` in `review`.
5. **Test arms appended to `agt-86i`:** **R** (live; needs ≥ 1 open finding else NOT RUN) — rpc with `groups=[{kind:'not-a-defect', reason:'qa', finding_ids:[first open id]}]` and `checklist_edits=[{skill_slug:'au-identity', field:'method', new_text:'x', reason:'qa'}]` → 400 `P0001` matching `/au-identity/` and `/John/`; `au-guardrails` → same; `dm-behavior` → the refusal (`/refused/`); `{au-knowledge-homes, field:'traits'}` → `/must be method or objective/`; `{au-knowledge-homes, field:'objective', new_text:'x', reason:'qa'}` → `/not covered/` and NOT `/John/` — the allowlist admits it, coverage stops the write. Pre-change every probe reads `not covered` only (the function ignores the key). Controls: `md5(coalesce(objective,'')||coalesce(method,''))` of the four `au-*` rows (via REST `select=slug,objective,method`), the `skill_profiles` image count and the `runner_decisions` count are re-read equal. **D** — `validateReview` on the same five shapes gives the identical texts. **I** — `skill_profiles?slug=eq.dm-audit-review-intent`: `traits.schema.properties.checklist_edits.items.required` deepEqual `[skill_slug, field, new_text, reason]`, `traits.schema.required` still the three, `method` contains `TIGHTEN:` and `PROMOTE:`; pre-change the property is absent. **P2** — `--prepare` context `checklist` slugs all match `EDITABLE_SLUG`, include `au-behavior` and `au-knowledge-homes`, exclude `au-identity`/`au-guardrails`; pre-change the key is absent. The permitted edit's before-image cannot be proven over REST without a real write — the migration's sub-block proves it rolled back, the same stated limit as 2a's `weeks_seen`. Control: `grep -l skill_profiles scripts/audit-ledger.js scripts/audit-cluster.js scripts/audit-board.js scripts/audit-corpus.js` → none, before and after: nothing in the Auditor's path gains a `skill_profiles` write (AGT-86 §11(5)).
6. **STOP LINE for 9b:** never write AGT-86 done (slices 5 and 8 remain); no checklist edit is made in the build — the first real one is the manager's, in a weekly review after three ruled weeks; report both sub-block outcomes, the intent-row decision id and each arm's pre/post state.

### 16.6 Decisions

1. **The scorecard is a view, not a script's arithmetic.** Two readers already exist for the numbers (the manager's context and, later, the weekly report and John's summary); one SQL definition is the shared core (pattern:14, pattern:93). A rolling window `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` over the check's rows by `iso_week` is "its last 3 weeks" as the ticket words it — weeks in which the check found something; a calendar window would count silent weeks as clean and dilute the rate. Stated as the chosen meaning (pattern:39).
2. **A ruling is `real` or `false_alarm`; a carry is neither.** `rulings = real + false_alarm`, so a check that is only ever carried never reaches three rulings and never flags — a carry is the manager declining to rule (pattern:40: `carried` is shown, named, and kept out of the rate).
3. **"≥ 3 rulings" is the check's lifetime total for inclusion; the tighten flag needs `rulings_3w ≥ 3` as well.** Otherwise one false alarm in a quiet three-week window (rate 1.00 on one ruling) would flag a check the ticket's own rule ("keeps raising false alarms") does not mean. The F arm pins that case (`rulings_3w 2` at rate `1.00` → null).
4. **Promotion reads finding rows, not the view.** A promotion is per fingerprint (one `other` finding recurring), which the per-check view collapses. `promotableOthers` counts distinct `iso_week` with status `ticketed` or `escalated` — the ticket's "ruled real (ticketed/escalated)" literally (pattern:90); `resolved` is the hand-seeded W37 status and is not a manager's ruling.
5. **The two flags are pure functions the test grades without a database** (pattern:162): the view's math is proven in the migration's rolled-back sub-block, the JS on view-shaped rows, the live arm only proves the path — the same three-layer split as slice 4.
6. **`check_slug IS NULL` rows are excluded from the view.** All 65 live rows have no slug (they predate slice 7's checklist), so the scorecard is empty until the first slice-7 run files slugged findings and the manager rules on them; the P arm asserts the count against a direct read rather than hardcoding `0` so it discriminates the day a slug lands.
7. **Edits ride `p_review`, not a fifth parameter.** The function's identity stays `(uuid, text, text, jsonb)` (`.claude/rules/supabase-function-signature.md`; 2b's POST body unchanged; `agt-86b`'s six refusal probes untouched). Validation of edits sits after the group rules and before coverage for the same reason 2a ordered `weeks_seen` before coverage: a probe can prove the allowlist without covering 63 live findings and without writing.
8. **The allowlist is a regex over the slug, not a table.** `^au-(behavior|knowledge-homes|[a-z-]+-intent)$` admits the six `au-*-intent` rows that exist and any future intent row the Auditor gains, and excludes `au-identity` and `au-guardrails` by construction. Adding a table for two forbidden names is a knob without a bound to justify it (pattern:67).
9. **Model.** Orchestrator lane `claude-opus-5` for both halves: a view with grant assertions and a function-body edit with a rolled-back proof are the 2a shape, where a grant mistake is live exposure (SES-315) and a cheaper model grinds (pattern:125).

### 16.7 Alternatives not taken

- **Skip the view; compute the scorecard in `--prepare` only.** Rejected: the report (slice 3's `renderReport`) and John's Monday summary (slice 8) will read the same numbers; two arithmetic copies are the SES-45 defect.
- **Let the Auditor tighten its own rows when a check's rate crosses 50%.** Rejected by John's words (§11(5): it cannot grade its own homework); the flag is context, the manager edits, the function images.
- **Hard-block edits to `au-identity`/`au-guardrails` in the JS only.** Rejected: the function is the write path and any service-role holder can call it; the refusal lives in SQL and the JS mirrors it (one validator, two doors).
- **A calendar-week rolling window (`RANGE`).** Rejected (decision 1); noted so a later reader does not "fix" the `ROWS` frame.
- **Prove the permitted edit's before-image over REST.** Impossible without a real review write; the sub-block proves it rolled back, stated in the kickoff.

### 16.8 What 9a does not do

No function change, no intent-row change, no checklist edit, no finding ruled; `validateReview`, `--dry-run` and `--apply` are byte-identical; `agt-86b` stays as it is. The scorecard is empty until slugged findings are ruled. Slices 5 and 8 are untouched.

### 16.9 Patterns applied (9a)

pattern:9 (deterministic flags, no model), pattern:14 and pattern:93 (one SQL definition both readers use), pattern:16 (the loop tracks itself from the ledger it already keeps), pattern:17 (extend `buildTaskContext` and `--prepare`, no parallel context), pattern:34/pattern:38 (the view counts every ruled row; `carried` shown, not hidden), pattern:39/pattern:40 (one named meaning for "rulings" and for "last 3 weeks"), pattern:64/pattern:66 (one slice, minimum useful), pattern:67 (no allowlist table), pattern:72 (cap not waived — the ticket's own split), pattern:90 (ticket's "ticketed/escalated" and "≥ 3 rulings", "≥ 50%", "3 distinct weeks" carried literally), pattern:92 (9b specified here for a cold session), pattern:125 (orchestrator lane), pattern:162 (every arm has a pre-change red), pattern:164 (default ACL on views, guard permits INSERT, no service key in `.env.local`), pattern:168 (kickoff 8,164 bytes).

## 15. Slice 8 — the Auditor's own routine and playbook, split 8a / 8b / 8c (kickoff `docs/kickoffs/v7.0.552-AGT-86-s8a-routine-prereqs.md`, 2026-09-23)

### 15.0 Premise: alive, and why the slice is three ships

Measured 2026-09-23 at `6730f662` (= origin/dev after slice 6's `76e5c55a` and the first-run ingest): `docs/runbooks/auditor-routine.md` does not exist; `runner-cycle.md:2003-2036` (2,701 B) still runs the corpus audit inside a builder cycle with "only John's hand ingests" (:2025), and every builder cycle since the 2026-09-22 pause is `did_not_run`, so the Auditor has not fired since. Three code facts stop a runbook from being written first:

1. `scripts/audit-cluster.js --run` (:569) refuses without `--cycle-id` and hands it to `agent-log.js --cycle` (`visitor_id`, unvalidated). The routine has no `runner_cycles` row by design (AGT-86 §7); passing a made-up id would attribute the log rows to a cycle that never existed (pattern:32). The honest fix is the same `attribution()` the ledger already uses (slice 3): exactly one of `--cycle-id` / `--session-name`, and `--cycle` omitted from the log row when it is a session (the ordinary `call_source = 'session'` shape).
2. `capabilityFor()` (:331) routes every cluster to the two corpus capabilities; `emitStatement`/`taskStatement` drop slice 6's `project` label, so `au-config-intent` (slice 7) could never be called with the `repo_visibility` it is written for. The config-review job is therefore run INSIDE the cluster run (one mechanism, pattern:17), not as a fourth stand-alone sub-agent — the three stand-alone jobs are board-health, work-quality and advisor.
3. `shared/ai-patterns.js` `SERVICE_CATALOG` lacks `audit-board-health`, `audit-work-quality`, `audit-config-review`, `audit-advisor` and `review-audit-worklist`; `agent-log.js:226` refuses an `--ai-type` outside it, so the routine could not log any of its five judgment runs (§19k, AI-audit-mandatory). Slices 2a and 7 wrote the rows without the catalog entry — the `audit-board` precedent (AGT-79) says the entry enters with the capability.

Runbook + these two scripts + a test = 4 files, over the cap; and a runbook that names flags no script carries fails its own "every flag exists" arm. So: **8a** (this kickoff) = the code the playbook calls; **8b** = the runner-cycle.md pointer, the card NOTES and the regenerated card; **8c** = the runbook, its prompt block, the test arms A/B and the agt-70 re-pin. The coordinator creates the routine OFF after 8c ships.

Alternatives rejected: (i) the routine opens a `runner_cycles` row — the ticket's §7 says no row, and the row's outcome vocabulary (shipped/gated/reverted/did_not_run/failed) has no honest word for a weekly audit; (ii) `--cycle-id=auditor-<W>` as a string — dishonest attribution, see 1; (iii) a fourth stand-alone config sub-agent fed hand-picked statements — a second copy of the cluster mechanism (SES-45); (iv) folding the catalog entries into 8c — the Builder would ship a runbook whose log calls are refused live, which a test without credentials cannot see.

### 15.1 Routine configuration (8c writes it into the runbook; the coordinator creates the routine from it, `enabled=false`)

| Field | Value | Why |
|---|---|---|
| name | `deepbench-auditor` | separate from `deepbench-runner` (`trig_017TZ3JZcLBK6AYH6DKURqMH`), its own switch (A-21) |
| cron | `0 10 * * 1` (UTC) | Monday 5:00 AM CDT; after DST ends 2026-11-01 John sets `0 11 * * 1` in the routine (the runbook records `0 10 * * 1` and says so) |
| model | the `orchestrator` row of `public.runner_model_lanes` at creation (`claude-opus-5` on 2026-09-23) | judgment work runs on the model `scripts/agent-prompt.js` prints |
| sources | `roadmapventure/deepbench-frontend` (branch `dev`), `roadmapventure/interviewquestions`, `roadmapventure/claude-config` | three clones side by side; the two private ones are read-only inputs |
| connectors | Supabase MCP (`mcp__Supabase__*`, the governance credential) | ledger, alerts, secrets by name |
| allowed_tools | the builder routine's ten (copy from a fresh `RemoteTrigger get` of `trig_017…`) plus `WebSearch` | `au-advisor-intent` has `enable_web_search true` |
| enabled | `false` at creation | John's switch alone |
| prompt | the block between `<!-- AUDITOR-ROUTINE-PROMPT-BEGIN -->` / `<!-- AUDITOR-ROUTINE-PROMPT-END -->` in `docs/runbooks/auditor-routine.md`, byte-identical | the routine-prompt.md convention: the file is the source, the routine the copy |

Update rule, as routine-prompt.md: edit the block → suite → commit → on John's word `RemoteTrigger update` with the WHOLE `ccr` (`environment_id`, `events`, `session_context`) read from a fresh `get`, then read back `derived_state.model` and `allowed_tools`.

### 15.2 The routine prompt, verbatim (8c task 1 copies this block into the runbook)

```
DEEPBENCH AUDITOR — WEEKLY AUDIT — stamp: DEEPBENCH-AUDITOR-<routine id> · trigger: scheduled (Monday 5:00 AM Central) or manual ("Run now"). The canonical copy of this prompt is docs/runbooks/auditor-routine.md (AGT-86): if the two differ, follow the runbook — it is the complete playbook and outranks this summary.

You are one run of DeepBench's Auditor. Three repos are cloned side by side: deepbench-frontend (work there; branch from origin/dev; the default branch is main — never push there), interviewquestions and claude-config (read-only sources; both are PRIVATE — never copy their contents into deepbench-frontend, which is PUBLIC). Supabase MCP tools (mcp__Supabase__*) are attached; secrets by NAME from runner_secrets, never printed — not in a query result, not on a command line.

1. Read docs/runbooks/auditor-routine.md from the deepbench-frontend clone and execute its steps 0-7 in order, exactly. Step 0 sets W (the ISO week), S (a scratch directory) and N=auditor-<W> — the session name every ledger write carries; there is no runner_cycles row — checks the three clones, reads the usage meter with the builder's step-1 command, and asks public.runner_should_boot() for its DETAIL only. The one stop is the weekly wall: gated_pct >= wall_pct, or a meter that could not be read and is older than meter_stale_hours. On that stop: one push to John "Auditor did not run — <reason>", then end. scheduler_off, nothing_pickable, weekly_pace and the gate's other reasons are the builder's refusals and never stop the Auditor.
2. Steps 1-2 gather and judge: the corpus with both extra roots and the private scan, the board checks as code, the cluster run under --session-name=$N (config-review clusters route themselves to audit-config-review), then three job sub-agents — board-health, work-quality and advisor (the advisor may use WebSearch) — each on the model scripts/agent-prompt.js prints and each logged with scripts/agent-log.js. Step 3 merges every source into docs/audits/$W-candidates.json and ingests it ONCE with --session-name=$N --apply. Step 4: if scripts/audit-review.js --prepare exits 0, run the Development Manager (review-audit-worklist) as a sub-agent on the model the assembly prints, then --dry-run and --apply; exit 3 means no findings — no manager run, no cost. Step 5 writes the week's report and commits docs/audits/* to dev (git fetch origin dev, rebase, git push origin HEAD:dev — never main). Step 6: SELECT * FROM public.claim_john_alerts() and send one push per row, in plain words, naming which of John's five calls it is. Step 7: always one summary push — found N (new / recurring / gone), tickets filed with ids and titles, not-a-defect, carried, escalated, and the decision handle that reverses the review.
3. The hand-off to the Development Manager is table rows sequenced by the runbook — never agent to agent. You write the work list and stop; the manager rules. Nothing in this run edits a skill row, flips a routine, merges to main or spends money — those are John's calls and reach him as john_alerts.
4. Model discipline: you are the orchestrator lane (public.runner_model_lanes, read live, never assumed); a failed sub-agent re-runs once one tier up, never twice at the same tier. Every claim in a push traces to a row, a SHA or a script's stdout. Priority classes are written named (P10 - Tooling); outcomes as plain words. This run ends when your turn ends — send the summary before you stop.
```

### 15.3 Steps 0-7 (8c task 1 copies these into the runbook, one numbered step each, commands verbatim; cwd = the deepbench-frontend clone root)

**Step 0 — stamp, clones, meter, the one stop.**
```
export W=$(date -u +%G-W%V); export S=$(mktemp -d); export N=auditor-$W
export SUPABASE_URL=<runner_secrets.SUPABASE_URL> SUPABASE_SERVICE_KEY=<runner_secrets.SUPABASE_SERVICE_KEY>   # read by name over the MCP; export inline; never echo
git fetch origin dev && git checkout -B session/$N origin/dev
for r in ../interviewquestions ../claude-config; do git -C "$r" rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "missing source clone $r"; exit 2; }; done
```
A missing clone → push "Auditor did not run — missing source clone <path>" and end. Every extra root is a git CHECKOUT (tracked files only): an attended run on John's machine clones fresh — `git clone --depth 1 https://github.com/roadmapventure/interviewquestions.git $S/iq` and `…/claude-config.git $S/cc` — and passes those paths; never a working folder (measured 2026-09-23: the working `C:/Projects/interviewquestions` yields 134,274 statements from an untracked 6.8 MB `spend/ledger/lookups.json`; the repo tracks 25 .md files).
Meter: run the builder's step-1 command verbatim — the one Bash command in `docs/runbooks/routine-prompt.md`'s prompt block, step 1, from `env -C /tmp claude -p` to the end of its `||` fallback — and act on its LAST line: an `INSERT` line runs verbatim as one `mcp__Supabase__execute_sql` query; a `NO_READING` line writes nothing and is quoted in the summary push. Then one query:
```sql
SELECT (detail->>'gated_pct')::numeric >= (detail->>'wall_pct')::numeric               AS weekly_wall,
       (detail->>'reading_age_hours')::numeric > (detail->>'meter_stale_hours')::numeric AS meter_stale,
       detail->>'gated_pct' AS gated_pct, detail->>'wall_pct' AS wall_pct, detail->>'wall_stop' AS wall_stop,
       detail->>'reading_age_hours' AS age_hours
FROM public.runner_should_boot();
```
Stop iff `weekly_wall` is true, or `meter_stale` is true AND the self-read printed `NO_READING` (pattern:165 — a wall nobody can read fails closed). Push "Auditor did not run — weekly wall: <gated_pct>% ≥ <wall_pct>% (<wall_stop>)" or "— meter unreadable: <age_hours> h old, NO_READING <reason>", and end. The `reason` column is never consulted: `scheduler_off`, `nothing_pickable`, `weekly_pace`, `unaffordable` are the builder's. (`wall_pct` is `final_day_rest_pct` on Thursdays — an on-demand Thursday run meets the stricter wall; the Monday fire always meets `weekly_rest_pct`.)

**Step 1 — gather (code; exit 2 from any line = that source could not run: keep going, name it in the summary push, the merge tolerates a missing file).**
```
node scripts/audit-corpus.js --out=$S/s.json --extra-root=interviewquestions=../interviewquestions --extra-root=claude-config=../claude-config --private-scan=$S/private.json
node scripts/audit-cluster.js --build --statements=$S/s.json --week=$W --out-dir=$S/c --repo-visibility=deepbench-frontend=public --repo-visibility=interviewquestions=private --repo-visibility=claude-config=private
node scripts/audit-cluster.js --run --dir=$S/c --session-name=$N
node scripts/audit-cluster.js --collect --dir=$S/c --statements=$S/s.json --week=$W --out=$S/cluster.json
node scripts/audit-board.js --out=$S/board.json
```
(`--run` logs every model call itself through `agent-log.js`; a cluster whose statements carry a `project` label runs `audit-config-review` / `au-config-intent` with `repo_visibility` — the config-review job.)

**Step 2 — three job sub-agents (judgment lane).** For each `<job>` / `<cap>` / `<intent>`: `board-health` / `audit-board-health` / `au-board-intent`; `work-quality` / `audit-work-quality` / `au-quality-intent`; `advisor` / `audit-advisor` / `au-advisor-intent`. Write `$S/<job>.task.json` (the intent row's task_context; sources below), then:
```
node scripts/agent-prompt.js --agent=auditor --capability=<cap> --task="$(cat $S/<job>.task.json)" > $S/<job>.prompt.md
node scripts/agent-prompt.js --agent=auditor --capability=<cap> --task="$(cat $S/<job>.task.json)" --json | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).llm.model))'
```
Run `$S/<job>.prompt.md` as an Agent-tool sub-agent on the printed model (the advisor's with WebSearch), stating the clone's absolute path; the answer is one JSON object `{cluster, findings, account}`. Save `{"week":"$W","found_by":"auditor:routine:<job>","findings":<answer.findings>}` as `$S/<job>.json`, then log:
```
node scripts/agent-log.js --agent=auditor --capability=<cap> --model=<printed model> --ai-type=<cap> --feature=<cap>:<intent>:depth1 [--input-tokens=<n> --output-tokens=<n>] [--patterns-applied=<csv>]
```
(token flags only when the sub-agent's usage is known — both or neither.) A sub-agent that returns no parseable object is re-run ONCE one tier up; still nothing → `$S/<job>.json` is written with `findings: []` and the summary names it.
task_context sources (`prior` for all three = `select fingerprint from public.audit_findings where iso_week = '$W'`):
- board-health: `week`; `board` = every `backlog_items` row with status in (open, partial) as `{backlog_id, title, status, epic_id, project (epics.project_id), tier, priority_class, defer_status, filed_at, revalidated_at, delivered_at}`, plus `description` (first 300 chars) only for rows filed or delivered in the last 14 days; `code_findings` = `$S/board.json`'s `findings`.
- work-quality: `week`; `shipped` = rows with `delivered_at` or status `done` in the last 7 days: `{backlog_id, title, description (first 1500), kickoff_path (ls docs/kickoffs/*-<ID>-*.md), ship_summary (latest runner_cycles.notes for that item, first 1500), verdict (latest runner_verdicts row), commits (git log origin/dev --since='8 days ago' --grep=<ID> --name-only --format='%h %s')}`; `code_findings` = `$S/board.json` findings with `check_slug quality-closed-red`.
- advisor: `week`; `platform_facts` = `{lanes: runner_model_lanes rows, claude_design_models: grep -n "claude-" CLAUDE-DESIGN.md, api_functions: node scripts/check-api-function-count.js output, budget: the current-month runner_budget row, hand_built: [scripts/audit-corpus.js, audit-cluster.js, audit-ledger.js, audit-board.js, audit-review.js, agent-prompt.js, agent-log.js, render-cycle-card.js, heal-engine.js, ticket-owner.js, tripwire-to-backlog.js — each with its header's first sentence]}`; `limits_hit` = `select outcome, last_step, count(*) from runner_cycles where started_at >= now() - interval '7 days' and outcome in ('did_not_run','failed') group by 1,2` plus the api/ function count against 12.

**Step 3 — merge, then ONE ingest** (`audit-ledger.js --report` reads exactly one file, `docs/audits/<W>-candidates.json`; several ingests would undercount "found"). Dedupes by `fingerprint()` across `findings` and `carried` — `UNIQUE (fingerprint, iso_week)` would otherwise abort the append mid-run. Tested 2026-09-23 on two fixtures (a shared finding kept once; a missing file skipped and named):
```
OUT=docs/audits/$W-candidates.json INS="$S/cluster.json $S/board.json $S/private.json $S/board-health.json $S/work-quality.json $S/advisor.json" node --input-type=module -e 'import fs from "node:fs"; import { fingerprint } from "./scripts/audit-ledger.js"; const d = { week: process.env.W, found_by: [], findings: [], carried: [], gone: [] }, seen = new Set(); for (const f of process.env.INS.split(" ")) { if (!fs.existsSync(f)) { console.log("merge: no file " + f); continue; } const j = JSON.parse(fs.readFileSync(f, "utf8")); d.found_by.push(String(j.found_by ?? f)); for (const k of ["findings", "carried"]) for (const x of j[k] ?? []) { const fp = fingerprint(x); if (seen.has(fp)) continue; seen.add(fp); d[k].push(x); } d.gone.push(...(j.gone ?? [])); } d.found_by = d.found_by.join(" + "); fs.writeFileSync(process.env.OUT, JSON.stringify(d, null, 2)); console.log(`merge ${d.week}: ${d.findings.length} findings, ${d.carried.length} carried, ${d.gone.length} gone, found_by ${d.found_by}`)'
node scripts/audit-ledger.js --ingest=docs/audits/$W-candidates.json --week=$W --session-name=$N --apply
```
(the ledger prints `ingest <W>: F findings, a new, b seen, c recurring, d ruled-out` — the summary's numbers.)

**Step 4 — the Development Manager's review, only when there is something to review.**
```
node scripts/audit-review.js --prepare --week=$W --out=$S/ctx.json; echo "prepare exit $?"
```
Exit 3 → "nothing to review — no manager run" goes in the summary; skip to step 5. Exit 0 →
```
node scripts/agent-prompt.js --agent=devmanager --capability=review-audit-worklist --task="$(cat $S/ctx.json)" > $S/review.prompt.md
node scripts/agent-prompt.js --agent=devmanager --capability=review-audit-worklist --task="$(cat $S/ctx.json)" --json | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).llm.model))'
```
Sub-agent on the printed model → `$S/answer.json` (`{groups, summary_for_john, patterns_applied}`); log it: `node scripts/agent-log.js --agent=devmanager --capability=review-audit-worklist --model=<printed> --ai-type=review-audit-worklist --feature=review-audit-worklist:dm-audit-review-intent:depth1 […]`. Then:
```
node scripts/audit-review.js --dry-run=$S/answer.json --context=$S/ctx.json
node scripts/audit-review.js --apply=$S/answer.json --context=$S/ctx.json --week=$W --session-name=$N
```
A `--dry-run` refusal → re-run the sub-agent ONCE with the refusal lines appended to the prompt; a second refusal → no `--apply`, the summary quotes the refusals, the findings stay `open` for next week. Keep `--apply`'s `Decision <id> — reversible until …` line and its ticket ids for step 7.

**Step 5 — report and record.**
```
node scripts/audit-ledger.js --report=$W --write
git add docs/audits/$W-candidates.json docs/audits/$W.md && git commit -m "auditor $W — <F> found, <T> tickets filed" && git fetch origin dev && git rebase origin/dev && git push origin HEAD:dev
```
Never main. An attended run commits in its own session's commit.

**Step 6 — John's calls.** `SELECT id, john_call, summary, detail, ref_table, ref_id FROM public.claim_john_alerts();` — one push per row: "John's call (<john_call>): <summary>", where `rules` = your own rules or past decisions, `money` = spending beyond what you approved, `production` = a dev → main release, `hiring` = creating or activating an agent, `switch` = turning an agent or routine on or off. Zero rows → no push.

**Step 7 — the summary, always.** One push: "Auditor <W>: found <F> (<a> new, <c> recurring, <g> gone); tickets filed: <ID — title, …> or none; not-a-defect <n>; carried <n>; escalated <n>; review decision <id>, reversible until <expires_at in America/Chicago>: select public.reverse_decision('<id>','John','<why>'); report docs/audits/<W>.md on dev; sources that could not run: <list or none>." When step 0 stopped, the did-not-run push IS the summary.

**On demand.** "Run now" on the routine, or any Claude session told "run the Auditor", follows steps 0-7 attended with `N=<its own session name>` and fresh clones under `$S` (step 0). No idempotence guard: a second run in one ISO week re-classifies its findings as `seen` and files nothing twice; the cost is the run's tokens, John's to spend. Local caveat, not a blocker: on Windows/Node 24 a script that calls `process.exit()` right after a fetch can abort with a libuv assertion (slice 3 measured it in `audit-ledger.js` and `audit-cluster.js`); the cloud routine is Linux.

### 15.4 Slice 8c — the runbook and the test arms (after 8b; 3 files)

Files: `docs/runbooks/auditor-routine.md` (new; §15.1 table, §15.2 block between the markers, §15.3 steps, the on-demand paragraph; one `<!-- DeepBench v7.0.5xx | runbooks/auditor-routine.md | AGT-86 slice 8c -->` stamp), `tests/regression/agt-86h-auditor-routine.test.mjs` (gains arms A, B, H), `tests/regression/agt-70-auditor.test.mjs` (part L re-pinned, §15.5). Arms: **A** both markers once; the block names `docs/runbooks/auditor-routine.md`, `weekly_wall`, `--session-name`, `claim_john_alerts`, `summary`, `never main`, stamp `DEEPBENCH-AUDITOR-`; contains neither `trig_017TZ3JZcLBK6AYH6DKURqMH` nor `prime_directive_queue`. **B** for every `node scripts/<x>.js …` line in the runbook, every `--name` token appears in that script's first 130 lines (red on the unchanged tree because the file is absent; and a runbook naming a flag no header carries fails). **H** runner-cycle.md's 4d body has no `only John's hand` and names `docs/runbooks/auditor-routine.md`; bytes ≤ 381,000 (green only after 8b). Model: `claude-fable-5-1` (judgment — the runbook is what a fresh cloud session executes). After 8c ships the coordinator creates the routine from §15.1 with `enabled=false` and pastes John a one-line "flip it on at claude.ai/code/routines when you want the first Monday run".

### 15.5 Slice 8b — runner-cycle.md step 4d becomes a pointer; the card follows (3 files)

Files: `docs/runbooks/runner-cycle.md`, `scripts/render-cycle-card.js`, `docs/runbooks/cycle-card.md`. Measured: step 4d is `:2003-2036`, 2,701 B; file 380,718 B of 381,000; `ses-377-cycle-card.test.mjs` holds the committed card byte-equal to `node scripts/render-cycle-card.js` (so the card is regenerated with `--write` in the SAME commit — no later ship point does it; the SES-424 slice-5 `--sync-knowledge` row is checked by `ses-424e`, an inherited red, and repinned with `--sync-knowledge --repin --cycle-id=386e52e6-08ae-4bf6-ad3d-5944882fb8ff --ticket=AGT-86` after the write); `agt-70-auditor.test.mjs:994-1012` (part L) greps the 4d body for `tripwire-to-backlog.js --from-ledger`, `audit-ledger.js --ingest=`, `date_trunc('week'`, and no line pairing `--ingest=` with `--apply`; `render-cycle-card.js:127` holds 4d's NOTES outcome (≤ 90 chars); `ses-364-reverse-agent-rows.test.mjs:309` pins the bold lead-in `**The allowlist, widened 7 → 14 by \`SES-364\`**` at `:4720` (keep it byte-identical).
Edits: (1) the 4d body (`**4d. ` up to the `<!-- FEATURE: AGT-79 slice 3` comment) becomes: `**4d. Weekly audit — retired from the cycle (\`AGT-86\` slice 8b).** The Auditor runs in its own routine — \`docs/runbooks/auditor-routine.md\` — and a builder cycle no longer audits: it does not run \`audit-ledger.js --ingest=\`, \`tripwire-to-backlog.js --from-ledger\` or the \`date_trunc('week'\` precondition; the routine ingests under its own session name and the Development Manager rules (\`ASKS-TO-JOHN\` A-27). Go to step 4e.` — the three retired strings are named so part L stays green until 8c re-pins it to the pointer (`points at auditor-routine.md`, no `only John's hand`); (2) `:4720`: after `` by `SES-364` `` insert ` and to 15 by \`AGT-86\` slice 1b (\`v7.0.543\`: \`audit_findings\`)` and append `audit_findings` to the list; (3) `render-cycle-card.js:127` outcome → `retired: the Auditor runs in its own routine (auditor-routine.md); go to 4e`; (4) `node scripts/render-cycle-card.js --write`, then the repin above. Header stamp: one new `v7.0.5xx` line, the oldest of the five rotated to `docs/SESSIONS.md` verbatim (agt-70 part L asserts 5 stamps and the `v7.0.446` line in SESSIONS.md). Frees ≈ 2,000 B. QA: `node scripts/render-cycle-card.js` exit 0; `wc -c` ≤ 381,000; `grep -c "only John's hand" docs/runbooks/runner-cycle.md` = 0; ses-364, ses-377, agt-70 source arms green. Model: `claude-opus-5` (mechanical doc edit).

### 15.6 Residue for the Development Manager (filed as evidence, not built here)

- `scripts/audit-corpus.js walkRoot()` walks the directory; for a root that is a git repository it should walk `git -C <root> ls-files` instead (tracked files only), so an attended run cannot drown the 12-cluster step on an untracked data file (measured: 134,274 vs 25 tracked .md in interviewquestions). One function, one test arm; slice 6's file.
- The `--session-name` attribution leaves `ai_activity_log.visitor_id` NULL for routine runs; if a per-run correlation is ever wanted, `agent-log.js` would need a session column, not `visitor_id` (LOG-91: never in `call_facts`).
- `capabilityFor()` sends a MIXED cluster (this repo + an extra root) to config-review; the corpus intent's knowledge is the broader one — if mixed clusters prove common, route on the majority label.

### 15.7 Patterns applied (8a)

pattern:9 (no model call where code serves — the merge and the stop are code), pattern:14 (one `attribution()` for ledger and cluster), pattern:17 (config-review rides the cluster mechanism), pattern:32 (attribute from what the call did — no fake cycle id), pattern:42 (plumbing is never shown as an agent acting), pattern:64/72 (one item; the cap split, never waived by me), pattern:126 (one push per run at the ship point), pattern:165 (the wall's sensor fails closed), pattern:166 (no John stop removed — the builder's gate is untouched), pattern:168 (kickoff ≤ 8,192 B; reasoning here).

### 15.8 Slice 8b addendum (kickoff `docs/kickoffs/v7.0.555-AGT-86-s8b-step-4d-pointer.md`)

The stamp rotation DROPS `v7.0.519` (SES-385 slice 2) after the SES-164 grep rather than relocating it to `docs/SESSIONS.md` — a fourth file the cap does not allow; its six named facts all have body homes (9 hits measured 2026-09-23). The Knowledge re-pin runs WITHOUT `--decision` so `render-cycle-card.js --repin` records its own `record_decision` (p_cycle_id = the AGT-86 cycle) and the full-row before-image — the omission AGT-96 found in earlier re-pins.

### 15.9 Slice 8c addendum (kickoff `docs/kickoffs/v7.0.556-AGT-86-s8c-auditor-runbook.md`)

The runbook is §15.1-§15.3 verbatim — nothing paraphrased, so the prompt block the coordinator pushes into the routine and the steps the routine reads are the text designed and tested here. After this ship the coordinator creates `deepbench-auditor` from the runbook's config table with `enabled=false` (A-21) and John flips it on at claude.ai/code/routines when he wants the first Monday 5:00 AM Central run.

### 16.10 9b kickoff notes (kickoff `docs/kickoffs/v7.0.554-AGT-86-s9b-checklist-edits.md`, 2026-09-23)

**Re-measured after the first real review.** The Development Manager's review was applied at 20:53Z (decision `cb459466-937a-4432-9271-faf8d597b5d9`: 63 findings → 11 tickets, 6 not-a-defect). Live at ~21:30Z: `audit_findings` 57 `ticketed`, 6 `not-a-defect`, 2 `resolved`, **0 open/carried**; `check_slug` still NULL on all 65; `audit_check_scorecard` exists (9a applied) with 0 rows; 63 `skill_profiles` images; `prosrc` of `apply_audit_review` has no `checklist_edits`; the intent row has no `TIGHTEN:`. §16.1's "63 open/carried" and §16.5's arm R are therefore stale.

**Why the probe design changed.** With an empty worklist the coverage check refuses nothing, so a probe whose only safety was `not covered` would PASS validation and write the permitted edit plus a decision. Every 9b rpc probe now carries `groups=[{kind:'carry', finding_ids:['00000000-0000-0000-0000-000000000000']}]` with no `reason`: `carry needs a reason` fires in the per-group loop before any write, independent of the ledger, and the zero uuid would still fail coverage behind it. To make that probe reach the allowlist at all, **edit validation moves to right after the groups-non-empty check and before the per-group loop** (amending §16.5 item 3's "after loop 1a"); `validateReview` mirrors the same position. The permitted-slug probe is now a control (`carry needs a reason` and not `John`), and the permitted write with its image is proven only by the migration's rolled-back sub-block A, which inserts its own fixture finding so it works at 0 open rows.

**9a is affected in one arm.** The committed 9a kickoff's arm P asserts `--prepare --week=2026-W39` exits 0; with 0 open/carried the script exits 3 (`NOTHING_TO_REVIEW`, 2b's rule), so that arm goes red on the live ledger regardless of the build. Arms V (view + grants) and F (pure flags) do not depend on open findings. The 9a Builder should assert P by branch — 0 open/carried → exit 3 with the §6 sentence; else exit 0 with `scorecard`/`promotions` — and the pure F arm already proves the keys via `buildTaskContext` with `scorecardRows`. 9b's P2 uses the same branch and proves the `checklist` filter over live `skill_profiles` rows through the pure half instead of the CLI.

Two smaller pins the kickoff adds to §16.5: a non-array `checklist_edits` is refused (`apply_audit_review: checklist_edits must be an array`), and arm I asserts the intent row's own UPDATE image. Kickoff 8,187 bytes.

### 15.10 Slice 8b2 — the two pins 8b moved (kickoff `docs/kickoffs/v7.0.557-AGT-86-s8b2-runbook-pins.md`)

8b built as designed and the suite blocked it correctly: `ses-413d`'s `BYTES_AT_SHIP` (380,718, re-measured by every ship that edits runner-cycle.md — `ses-424f` imports it) reads 378,273 on the 8b tree, and `ses-424c`'s `five-stamps-and-this-ship-is-the-first` expects `v7.0.535` on line 1, which 8b's own stamp now holds. §15.5 named agt-70, ses-364 and ses-377 as the pins and missed these two — the byte pin because it lives in a test named for a different ticket (SES-413d), the stamp clause because it grades line 1 rather than presence. Both are re-pinned to the measured tree with the reason in the same push as 8b (pattern:162: a check grades the change). 8b's commit stays unpushed until 8b2 lands beside it, so dev never carries a red pin.
