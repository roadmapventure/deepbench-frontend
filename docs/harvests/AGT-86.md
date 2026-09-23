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
