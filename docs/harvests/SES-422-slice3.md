<!-- DeepBench v7.0.528 | harvest | SES-422 slice 3 — design reasoning (cycle 217e3721-7ca7-4582-94c0-b39ff7ee7998, 2026-09-19) -->

# SES-422 — harvest for slice 3 (SES-411, the rule-vs-function check)

Not required reading for the build. Every fact a task depends on is in `docs/kickoffs/v7.0.528-SES-422-rule-vs-function-check.md`.

## 1. Premise revalidation — alive

The folded row SES-411 (status `removal proposed`, folded into SES-422 on 2026-09-18) claims no check compares a governance rule with the function that enforces it, and that the 2026-09-15 live fix (`live_fix_orchestrator_pace_degrade_20260915`, commit `e46a4a24`) went unnoticed for that reason until SES-410 (v7.0.510). Re-measured this cycle, all live:

| Home | Measurement (2026-09-19, SQL via the service role unless noted) | Reading |
|---|---|---|
| `pg_proc` | `runner_should_boot()`: exactly 1 overload, `STABLE`, `proacl = {postgres=X/postgres,service_role=X/postgres}`, `pg_get_functiondef` 7,776 bytes. `THEN '…'` literals: `final_day_rest_pct, meter_stale, no_budget_row, nothing_pickable, scheduler_off, unaffordable, weekly_pace, weekly_wall`. | body enforces seven refusals + one column pick |
| `COMMENT ON FUNCTION` | "Pre-boot pickability gate (SES-297 / M6-09). SEVEN refusals in precedence order: scheduler_off, meter_stale (SES-389 / M5-15, runner_settings.meter_stale_hours), weekly_wall (M5-06), weekly_pace (M5-16), no_budget_row, nothing_pickable, unaffordable (M5-06); otherwise pickable. …" It is the ONLY `public` function whose comment matches `\mM[0-9]-[0-9]{2}\M` (Postgres reads `\b` as backspace — my first census query returned `[]` for that reason; the RPC filter in the kickoff uses `\m…\M`). | comment attributes 4 refusals to 3 rule ids, cites M6-09 |
| `governance_rules` | M5-06, M5-15, M5-16, M6-09 all `status = 'live'`, `enforcement = 'script'` (146 live rows of 163). M5-15 statement: "… `public.runner_should_boot()` refuses the boot as `meter_stale` …"; M5-16: "`public.runner_should_boot()` applies it as the refusal `weekly_pace`, after `weekly_wall` … and before `no_budget_row`"; M5-06 and M6-09 name neither a function nor a refusal literal. | 2 of 4 statements name their refusal |
| `tests/regression/ses-297-pre-boot-pickability.test.mjs:98` | `REASONS` = 7 strings, `PASS_REASON = "pickable"`. `scripts/render-cycle-card.js:48` mirrors it by hand rather than importing. | the oracle the live fix rewrote |
| `runner_migration_downs` | `ses410_weekly_pace_stop` (auto-downable, captured 2026-09-16 16:14Z by cycle `c277b0a2`): `prior_ddl.captured[0].prior_definitions[0]` = 7,285 bytes, `THEN 'weekly_pace'` at position 0 (absent), "Live fix" at 1629, THEN literals `meter_stale, no_budget_row, nothing_pickable, scheduler_off, unaffordable, weekly_wall`. The SES-410 migration carried no `COMMENT ON`, so today's comment is the comment that stood beside the broken body. | the ticket's own QA fixture exists and is readable over REST |
| repo | `grep -rl "rule-vs-function\|expected refusals\|SES-411"` outside backlog/harvest/kickoff docs hits only `CLAUDE-STATE.md` and `docs/JOHN-DECISION-PATTERNS.md` (prose). `audit-corpus.js` has two detectors (`detectDuplicates`, `detectStaleParameters`); `audit-cluster.js` never re-runs them. Every credentialed test file states "PostgREST cannot read pg_get_functiondef". | unbuilt; the read path is the missing piece |

**Verdict: alive.** Four homes state the refusal set — register, comment, body, test oracle — and nothing reads more than one of them. Running the exact derivation the kickoff specifies (a scratch node script, no repo edit) over the captured pre-SES-410 body with today's comment, today's rules and `REASONS` minus `weekly_pace` yields one finding for `runner_should_boot()` with lines `body lacks weekly_pace` and `REASONS lacks weekly_pace`; over the same body with the full `REASONS` it yields `body lacks weekly_pace` and `REASONS names weekly_pace, body lacks it`; over the body with the branch textually restored it yields `[]`; with `overloads: 2` it yields exactly `overloads 2`. M5-16 was updated 2026-09-14 17:38Z, before the live fix, so the derivation would have fired on `e46a4a24` the hour it landed.

## 2. What the check compares, and why four homes rather than two

The ticket asks for expected refusals "derived from the governance_rules statements that name them". Measured, only M5-15 and M5-16 name a refusal literal at all, and each names it in the same clause as `public.runner_should_boot()`. M5-06's statement ("Never start a ticket whose predicted cost exceeds the remaining weekly usage headroom …") and M6-09's ("every scheduled fire is gated by a pre-boot pickability query …") name no function and no literal. So a derivation from statements alone covers half the ticket's list and would have to invent the other half — a fixed map `M5-06 → weekly_wall, unaffordable` in the detector would be a second home for exactly the kind of claim the Auditor exists to find.

The function's own `COMMENT ON FUNCTION` already carries that map, as data, next to the code: `weekly_wall (M5-06)`, `unaffordable (M5-06)`, `meter_stale (… M5-15 …)`, `weekly_pace (M5-16)`, and the gate as a whole `(SES-297 / M6-09)`. It is also the home the live fix left untouched while gutting the body, which is what makes comment-vs-body a discriminating comparison in the historical case. So the detector reads four homes and asserts pairwise containment where a claim exists:

- (A) statement-bound tokens ⊆ body THEN literals, and ⊆ the test's closed set;
- (B) comment-enumerated tokens ⊆ body, and ⊆ the closed set;
- (C) closed set ⊆ body; every rule id cited or bound is `live`; exactly one overload.

Deliberately NOT asserted: body ⊆ closed set. `THEN 'final_day_rest_pct'` is a column pick inside the `budget` CTE, not a refusal, and asserting the reverse direction would file a finding on it forever.

The REASONS binding (`CLOSED_SETS = { runner_should_boot: REASONS }`) is one line in `audit-corpus.js`. It is the only hand-written link in the design; ses-297's header names the function it tests, but exporting that name from the test would be a fourth file. Recorded, not hidden.

## 3. Alternatives set aside

- **Read the body from the repo.** Migrations are applied through `apply_migration` and are not checked in (`supabase/` has no migrations directory); the only repo-side copy of any body is a kickoff's prose. The database is the one home.
- **Reuse `capture_migration_down()` as the reader.** It returns `prior_definitions`, but it writes a `runner_migration_downs` row and a before-image on every call — a reader that writes is not a reader.
- **An RPC that takes a function name.** Rejected in favour of a name-free `rule_enforcing_functions()` that returns every `public` function whose comment cites a rule id: no list of function names in the script, and the next gate that documents itself the same way is audited without a code change. Today it returns one row; the kickoff says so.
- **A fixed table `rule → refusal`.** Rejected above (§2).
- **Editing `runner-cycle.md` step 4d so the drift finding reaches `--ingest`.** Fourth file, and the runbook sits at 380,902 bytes against the 381,000 ceiling (env fact 2026-09-15); an edit must first remove bytes. Filed as a discovery (§6) rather than squeezed in.
- **Extending `agt-70-auditor.test.mjs`.** Also a fourth file. Checked instead that every existing pin survives an appended band: `:390` `/duplicates 1\b/`, `:1150` `/… duplicates 0 stale 0/` (unanchored), `:1347` `/stale 0/`, `:1360` `BAND … stale (\d+)\b`. All match with ` drift <n>` or ` drift not-run` appended.

## 4. Grants and the read path

`pg_default_acl` for `postgres` in `public` grants EXECUTE on new functions to `anon`, `authenticated` and `service_role` (`postgres/public/f={…anon=X…,authenticated=X…}`), so a new RPC is publicly callable until revoked. `ses297_runner_should_boot` set the pattern the kickoff copies: `REVOKE ALL ON FUNCTION … FROM PUBLIC, anon, authenticated; GRANT EXECUTE … TO service_role;`. The function returns `pg_get_functiondef` and `obj_description` for every public function whose comment cites a rule id — source code, readable already by anyone holding the service key, and by nobody else after the revoke. `has_function_privilege('anon', …)` is asserted false in the migration's own `DO` block (the column-grants rule: assert both directions, never trust the success flag). PostgREST exposes a zero-argument `STABLE` function to `GET /rest/v1/rpc/<name>`; `NOTIFY pgrst, 'reload schema'` is in the migration so the first read does not race the schema cache.

Down: `capture_migration_down` on a function that does not exist yet records `existed = false` and a `drop function if exists` step — `auto-downable`, 1 captured, 0 refused. The capture's own before-image (`table_name = 'runner_migration_downs'`, `pk_value = 'ses411_rule_enforcing_functions'`) is the only row this slice writes; the slice-2 trigger guards `backlog_items` keys only, so a text key there is correct.

## 5. Lane choice and baseline

`judgment` → `claude-fable-5-1` (read live: orchestrator `claude-opus-5`, judgment `claude-fable-5-1`, mechanical `claude-sonnet-5`). The work is three regexes and a containment check, but the failure mode of that work is a detector that passes on everything — the class of defect SES-411 exists to catch. That is judgment, not formatting.

Baseline red set, unchanged tree `b4e4624d`, this cycle: `agt-70-auditor.test.mjs` green, `ses-297-pre-boot-pickability.test.mjs` green, `Red set: 0 of 2`. No `VITE_SUPABASE_ANON_KEY` or `.env.local` in this clone, so the anon-denial arm of the new test declares `notRun` here and the migration's `DO` block carries that assertion instead.

## 6. Discoveries for The Development Manager (not filed by this design run)

1. **Deterministic Auditor findings never reach the ledger on their own.** Step 4d runs `node scripts/audit-corpus.js --out=$S/s.json` with no `--detect=`, and `audit-cluster.js --collect` never re-runs `detectDuplicates` / `detectStaleParameters`; only the model lane's clusters become `docs/audits/<W>-candidates.json`. The stale-temperature finding in the ledger (`4ef228c361f9a904`) got there by hand. After this slice the drift finding is printed in the band and written by `--detect=<json>` in exactly the `{findings:[…]}` shape `audit-ledger.js --ingest` reads, but nothing in 4d carries it there. One runbook line (`--detect=$S/d.json` on the corpus call, a second `--ingest=$S/d.json` dry run) closes it; the runbook byte ceiling makes that its own small ticket. Class **P10 - Tooling**.
2. **Two of the four rules do not name what enforces them.** M5-06 and M6-09 name no function and no refusal literal, so for them the check's anchor is the function comment — a home the same migration that breaks the body can rewrite. Wording a `live` register row is John's decision (SES-410: "the rule is John's"); the ask is one sentence each: M5-06 → `public.runner_should_boot()` refuses as `weekly_wall` and `unaffordable`; M6-09 → refuses as `nothing_pickable`. Class **P10 - Tooling**, gated on John.

## 7. Residue named in the STOP LINE

SES-287 — `scripts/rollback-on-red.js:36-38` and `docs/harvests/SES-287.md:112` record all four defects closed (SES-352 anchor trigger, v7.0.507 range gate, v7.0.525 card tense + decision). Its row reads `removal proposed`, `kickoff_link = docs/kickoffs/v7.0.525-SES-287-revert-outcome-settled.md`. Not re-measured beyond the row this cycle; the next cycle re-reads `readGreenAnchor()` against `ci_run_conclusions` once and proposes closing SES-422 with it. Until then SES-422 stays `partial`.
