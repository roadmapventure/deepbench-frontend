# DAT-30 — harvest (design, cycle af60da29, v7.0.1046, tree 4ac0bd0, 2026-11-16)

Reasoning behind `docs/kickoffs/v7.0.1046-DAT-30-secret-rotation-stamp-and-brief-age.md`. The build does not need this file.

## 1. Premise — alive, and two days from the ticket's own deadline

Measured 2026-11-16T16:49Z with `runner_secrets?select=name,updated_at` (the `value` column was never selected, by me or by any script I ran).

| key | updated_at (UTC) | age in days | cause it is this old |
|---|---|---|---|
| SUPABASE_URL | 2026-08-20 03:14:32 | 88 | never changed since first insert; it is an address, not a credential |
| SUPABASE_SERVICE_KEY | 2026-08-20 03:14:32 | 88 | never rotated |
| VERCEL_AUTOMATION_BYPASS_SECRET | 2026-08-20 03:14:32 | 88 | never rotated |
| ANTHROPIC_API_KEY | 2026-08-20 03:14:32 | 88 | never rotated |
| VERCEL_TOKEN | 2026-08-20 04:21:20 | 88 | never rotated |
| SCRATCH_SUPABASE_SERVICE_KEY | 2026-08-28 20:27:49 | 79 | never rotated |
| MCP_API_KEY | 2026-09-10 00:25:52 | 67 | never rotated |
| YAHOO_IMAP_APP_PASSWORD | 2026-09-25 19:37:56 | 51 | never rotated |
| YAHOO_IMAP_USER | 2026-09-25 19:38:40 | 51 | a username, not a credential |
| MCP_KEY_interviewquestions | 2026-10-23 18:41:07 | 23 | never rotated |
| OPENAI_API_KEY | 2026-11-12 22:11:14 | 3 | new since the ticket was written (the ticket counts ten rows; there are eleven) |

Eleven rows, eleven accounted for, no remainder. One cause covers all nine credentials: nothing in the platform rotates a key, records a rotation, or shows an age. That is the cause this design removes the last two thirds of; the first third (rotating) needs the provider accounts.

Other live facts the design rests on:

- `runner_secrets` columns are `name` (PK), `value`, `note`, `updated_at` (default `now()`). There is no trigger on the table, so `updated_at` is only a default: an UPDATE that omits it leaves it untouched. It is the best evidence of age that exists, which is why the backfill copies it, and why it cannot be the stamp going forward.
- `relacl` is `{postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres}`: `anon` and `authenticated` hold nothing, as the ticket says. RLS is off; the exposure is the service key and the connector, not the browser key.
- `select=rotated_at` answers `42703 column runner_secrets.rotated_at does not exist`.
- 0 of 178 `governance_rules` statements mention secret, rotation or a 90-day cadence (the one hit for `90` is OD-28's rest wall).
- `docs/runbooks/standing-brief.md` holds 0 lines starting `**Secret age**`; `scripts/render-standing-brief.js` holds 0 occurrences of `secret`.
- The ticket says `scripts/build-briefing.mjs` has no secret-age read. True, but that script builds the briefing page; "the standing brief" is `docs/runbooks/standing-brief.md`, rendered by `scripts/render-standing-brief.js`. The design builds in the second one. The briefing page is published, so a list of key ages does not belong on it (pattern:139).
- `.github/workflows/ci.yml` (lines 302-303, 362-363) and `meter-reader.yml` (lines 64-66) read `secrets.SUPABASE_URL`, `secrets.SUPABASE_SERVICE_KEY` and `secrets.CLAUDE_CODE_OAUTH_TOKEN`, as the ticket says.

## 2. What ships now and what does not, and why

**Ships (one migration, one script, one test, one generated file):** a `rotated_at` stamp that only a change of `value` can move, a per-row cadence (`rotation_days`), and a `Secret age` group on the standing brief.

**Does not ship, named on the ticket rather than hidden:**

1. **Rotating the keys.** The ticket's build text gives this to John ("the accounts are his"). No tool a cycle holds reaches Anthropic's, Vercel's, Supabase's, Yahoo's or GitHub's key pages. I did not design a task that asks him, reminds him or routes around it: a chore handed to a person is a platform gap, and the open ticket that covers the gap is `AGT-675` ("Every actor is a shared, long-lived key: no personal sign-in, no rotation record…"). `DAT-30` stays open on this sentence.
2. **The `governance_rules` row.** Deferred, and I want the reason on record in full, because there are two. The engineering reason: four keys pass 90 days on 2026-11-18 03:14-04:21 UTC and no cycle can cure that, so a rule stated today is a live rule breached within two days by a cause the platform cannot act on; meanwhile the cadence is already stored as data (`rotation_days`, default 90), so nothing reads the number from prose. The second reason is plain: with the rule row, its decision record, its before-image, a home section in a doc and a snapshot re-export, the kickoff measured 10,166 bytes against the 8,192 cap after reasoning had already been moved here; without it, 8,133. Something had to wait, and the rule is the part that changes nothing a reader of the brief sees. When it is written, the shape I had drafted: id `SECRET-ROTATION-90`, `prose`, `live`, source group `standards-caps`, statement "A stored key is rotated within its row's `runner_secrets.rotation_days` (column default 90; NULL marks a row that is not a rotating credential). `runner_secrets.rotated_at` moves only when the row's value changes, and the standing brief's `Secret age` group shows every key's age; canonical: those two columns."; inserted under a `record_decision(..., 'rule', 'DAT-30', ...)` with a NULL before-image, as `docs/design/agt-445-cap-ruling.sql` lines 211-225 do; then `node scripts/export-governance-snapshot.js`. Its canonical_doc needs a file that exists (hygiene check 10). Adding it widens the related test set from 20 to 38 through `docs/governance/RULES-SNAPSHOT.md` (all 38 were green uncredentialed on 4ac0bd0).
3. **A scoped CI key.** The ticket conditions this on Supabase offering one. Read in Supabase's docs on 2026-11-16 ("Understanding API keys", "Migrating to publishable and secret API keys"): secret keys can be created, named and revoked one at a time, and every one of them maps to the `service_role` Postgres role with RLS bypass. That isolates a rotation; it does not narrow a privilege. So the condition is not met, and creating a separate CI key is a dashboard-plus-GitHub-secret act of the same blocked kind as item 1.
4. **Age of the GitHub Actions secrets.** Not in the table, not readable from the database. The group says so in one line rather than leaving them out silently (pattern:34).

## 3. Calls I made (reversible), with the alternative each one beat

- **Cadence as a column, not a constant.** A flat 90 in the script would mark `SUPABASE_URL` and `YAHOO_IMAP_USER` overdue forever: one is an address, one a username, and neither can be "rotated". With a constant, the ticket's own acceptance line ("oldest-key age under 90") could never be met. `rotation_days` NULL means "not a credential"; the migration sets it for exactly those two names. Which rows are credentials is my reading of the names; changing one is a single UPDATE.
- **The stamp is a trigger, and it pins itself.** `rotated_at` becomes `clock_timestamp()` when `value` changes and is put back to its old value otherwise, so nobody can make a key look fresh by editing the date, and nobody has to remember to set it when pasting a new value. `clock_timestamp()` rather than `now()` so the migration's own gate can prove the stamp moved inside one transaction.
- **Direct named-column read, no new function.** `runner_secrets?select=name,rotated_at,rotation_days` with the service key the script already requires, the same pattern `scripts/security-inventory.js:446` uses for names. The test refuses a source that ever selects `*` or `value` from this table.
- **Outside `factsSha()`.** An age moves with the clock; hashing it would report drift on every run (`AGT-281`'s rule, followed by the stalls, waste and refusal groups).
- **A non-array read stops the render**, as every other read in `fetchFacts()` does. Consequence, stated in the risk block: if the columns were ever dropped while the script still reads them, the brief render fails until the script is reverted. Undo order is script first, then columns.
- **No backfill beyond `updated_at`.** It is the only evidence there is.

## 4. Risk and undo

The migration is an in-place ALTER of an existing table, which `capture_migration_down()` classifies `refused` by design; the ship is card-only, not auto-rollbackable, and T1 says to state that. By hand: revert the script, then `drop trigger runner_secret_stamp on public.runner_secrets; drop function public.runner_secret_stamp(); alter table public.runner_secrets drop column rotated_at, drop column rotation_days;`. Reach: eleven rows gain two columns; no value is read, compared outside the trigger, or changed; readers that name their columns are unaffected. No agent's autonomy changes. Trigger functions are not checked for EXECUTE at fire time, so revoking the three named roles does not stop the trigger; the gate asserts the revoke took (`.claude/rules/supabase-column-grants.md`, SES-315 addendum).

## 5. What I did not verify

- **SQL-A was not executed**, not even in a rolled-back transaction: this turn was told to write nothing, and DDL on the secrets table takes a lock. It was read against the live schema (column names, the absent trigger, the ACL, `capture_migration_down`'s `<name> on <schema.table>` trigger identity, read from the function's own source). The gate block in T1 is what proves it on apply.
- **BASELINE is uncredentialed** for the same reason (credentialed tests write fixtures). 38 tests green on 4ac0bd0, of which the kickoff's 20; step 7 measures the credentialed one.
- **Whether the service key is a legacy JWT key or a new `sb_secret_` key**: telling them apart means looking at a value. It matters, see below.

## 6. Found on the way, not designed here

- Supabase's migration guide, read 2026-11-16, says legacy `anon` and `service_role` keys "keep working until the end of 2026". If this project's keys are the legacy kind, every reader of `SUPABASE_SERVICE_KEY` (the runner, both workflows, Vercel) has a hard date about six weeks out, independent of any 90-day cadence. Not verified (see section 5) and not filed by me, since this turn writes nothing; it belongs with `AGT-675`.
- The ticket text says ten rows; there are eleven (`OPENAI_API_KEY`, 2026-11-12).
- The literal `L.push(renderRefusalLedger(ledger, stamp));` is held by two tracked files, the script and `tests/regression/agt-610-refusal-brief.test.mjs`; the anchor declares 2.

## 7. Dry runs

- The JS in the kickoff, applied to a pristine copy of 4ac0bd0 exactly as T2 words it: the T3 test exits 0; on the unchanged tree it exits 1 with all four arms failing, first line `rows: renderSecretAge must be exported`. The 20 related tests plus the new one: 0 red of 21, uncredentialed.
- The same code over today's eleven names and stamps (with `rotation_days` as the migration will set it): `**Oldest key: 88 days (`ANTHROPIC_API_KEY`)**, 0 of 9 rotating keys overdue.`; at 2026-11-18T03:14:33Z it reads 90 days and 3 of 9; from 04:21:21Z, 4 of 9.
- `node scripts/verifier.js --check-kickoff=<draft>`: exit 0, 8,133 bytes. The first run refused the anchor above at a declared count of 1.
- The Redesign line is written in the form `scripts/redesign-pickup.js` parses (`differs: staging; because: …; from prior: …`). Its regex does not accept a parenthesis between the `differs` word and the semicolon, so the "(attempt 1: first)" note is left out.

## 8. Sources opened

Ticket row `DAT-30`; `runner_secrets` (names, stamps), `runner_model_lanes`, `governance_rules`, `pg_trigger` / `pg_constraint` / `pg_class.relacl` / `pg_proc` for the two tables; `scripts/render-standing-brief.js`; `tests/regression/agt-607-stalled-cycles-brief.test.mjs`, `agt-610-refusal-brief.test.mjs`; `docs/design/agt-445-cap-ruling.sql`; `docs/runbooks/runner-cycle.md` (down capture); `scripts/verifier.js`, `related-tests.js`, `baseline-red-set.js`, `redesign-pickup.js`, `check-session-docs.js`; both workflows; `docs/kickoffs/v7.0.1045-AGT-517-…md` and `v7.0.448-SES-368-…md`; Supabase's API-key docs. Each fact a task needs from them is in the kickoff.
