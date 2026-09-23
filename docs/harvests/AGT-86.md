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
